import { initNavbar } from '../components/navbar.js';
import { initSidebar } from '../components/sidebar.js';
import WalletService from '../services/wallet.service.js';
import AuthService from '../services/auth.service.js';
import router from '../router.js';
import * as Template from './wallet.template.js';

export async function renderWallet() {
    const app = document.getElementById('app');
    const session = AuthService.getSession();

    if (!session) {
        router.navigate('/login');
        return;
    }

    try {
        const response = await WalletService.getBalance(session.userId);
        // Nếu response.data là object, ta lấy thuộc tính balance, nếu không thì lấy trực tiếp data
        const balance = response.success ? (typeof response.data === 'object' ? (response.data.balance || 0) : response.data) : 0;

        app.innerHTML = Template.getWalletTemplate(balance);
        initNavbar();
        initSidebar();
        setupEventListeners();
    } catch (error) {
        console.error('Lỗi khi tải ví:', error);
        app.innerHTML = '<div class="alert alert-danger">Không thể tải dữ liệu ví.</div>';
    }
}

function setupEventListeners() {
    const form = document.getElementById('redeem-card-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const session = AuthService.getSession();
        const provider = form.querySelector('input[name="provider"]:checked').value;
        const amountRadio = form.querySelector('input[name="amount"]:checked');
        const amount = parseInt(amountRadio.value);
        const gemCost = parseInt(amountRadio.dataset.gems);

        const confirmRedeem = confirm(`Bạn có chắc muốn dùng ${gemCost} Gem để đổi thẻ ${provider} ${amount.toLocaleString()}đ không?`);
        
        if (confirmRedeem) {
            try {
                const response = await WalletService.redeemCard(session.userId, provider, amount);
                if (response.success) {
                    alert('Đổi thẻ thành công! Mã thẻ đã được gửi tới hòm thư của bạn.');
                    renderWallet(); // Tải lại trang để cập nhật số dư
                } else {
                    alert('Lỗi: ' + (response.message || 'Không đủ Gem hoặc lỗi hệ thống'));
                }
            } catch (error) {
                alert('Giao dịch thất bại: ' + (error.message || 'Lỗi kết nối'));
            }
        }
    });
}