import { renderNavbar } from '../components/navbar.js';
import { renderSidebar } from '../components/sidebar.js';

export function getWalletTemplate(balance) {
  return `
    ${renderNavbar()}
    ${renderSidebar()}
    <div class="main-content">
      <div class="container-fluid">
        <div class="row mb-4">
          <div class="col-12">
            <h2 class="fw-bold"><i class="bi bi-wallet2 me-2 text-primary"></i>Ví Gem của tôi</h2>
            <p class="text-muted">Quản lý số dư và đổi thẻ cào điện thoại</p>
          </div>
        </div>

        <div class="row g-4">
          <!-- Thông tin số dư -->
          <div class="col-lg-4">
            <div class="card border-0 bg-primary text-white shadow-sm mb-4">
              <div class="card-body p-4 text-center">
                <h6 class="text-white-50 text-uppercase small fw-bold">Số dư khả dụng</h6>
                <h1 class="display-4 fw-bold my-3" id="balance-display">${balance.toLocaleString()}</h1>
                <div class="badge bg-white text-primary px-3 py-2 rounded-pill">
                    <i class="bi bi-gem me-1"></i> Gem
                </div>
              </div>
            </div>
            
            <div class="card border-0 shadow-sm overflow-hidden">
                <div class="card-header bg-light border-0 py-3">
                    <h6 class="mb-0 fw-bold"><i class="bi bi-info-circle me-2"></i>Tỷ lệ quy đổi</h6>
                </div>
                <div class="card-body p-0">
                    <div class="list-group list-group-flush">
                        <div class="list-group-item d-flex justify-content-between align-items-center py-3">
                            <span>50 Gem</span>
                            <span class="badge bg-success-soft text-success rounded-pill">10.000đ</span>
                        </div>
                        <div class="list-group-item d-flex justify-content-between align-items-center py-3">
                            <span>2.500 Gem</span>
                            <span class="badge bg-success-soft text-success rounded-pill">500.000đ</span>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <!-- Khu vực đổi thẻ -->
          <div class="col-lg-8">
            <div class="card border-0 shadow-sm h-100">
              <div class="card-header bg-white py-3 border-bottom">
                <h5 class="mb-0 fw-bold text-dark">
                    <i class="bi bi-phone-vibrate me-2 text-primary"></i>Đổi thẻ cào điện thoại
                </h5>
              </div>
              <div class="card-body p-4">
                <form id="redeem-card-form">
                  <div class="row g-4">
                    <div class="col-md-12">
                      <label class="form-label fw-bold small text-muted text-uppercase">1. Chọn nhà mạng</label>
                      <div class="d-flex gap-3">
                        <div class="flex-fill">
                          <input type="radio" class="btn-check" name="provider" id="viettel" value="Viettel" checked>
                          <label class="btn btn-outline-primary w-100 py-3 fw-bold" for="viettel">VIETTEL</label>
                        </div>
                        <div class="flex-fill">
                          <input type="radio" class="btn-check" name="provider" id="mobifone" value="Mobifone">
                          <label class="btn btn-outline-primary w-100 py-3 fw-bold" for="mobifone">MOBIFONE</label>
                        </div>
                      </div>
                    </div>
                    
                    <div class="col-md-12">
                      <label class="form-label fw-bold small text-muted text-uppercase">2. Chọn mệnh giá</label>
                      <div class="row g-2" id="amount-options">
                        <div class="col-6 col-md-4">
                            <input type="radio" class="btn-check" name="amount" id="amt-10" value="10000" data-gems="50" checked>
                            <label class="btn btn-outline-secondary w-100 py-3" for="amt-10">10,000đ<br><small>50 Gem</small></label>
                        </div>
                        <div class="col-6 col-md-4"><input type="radio" class="btn-check" name="amount" id="amt-20" value="20000" data-gems="100"><label class="btn btn-outline-secondary w-100 py-3" for="amt-20">20,000đ<br><small>100 Gem</small></label></div>
                        <div class="col-6 col-md-4"><input type="radio" class="btn-check" name="amount" id="amt-50" value="50000" data-gems="250"><label class="btn btn-outline-secondary w-100 py-3" for="amt-50">50,000đ<br><small>250 Gem</small></label></div>
                        <div class="col-6 col-md-4"><input type="radio" class="btn-check" name="amount" id="amt-100" value="100000" data-gems="500"><label class="btn btn-outline-secondary w-100 py-3" for="amt-100">100,000đ<br><small>500 Gem</small></label></div>
                        <div class="col-6 col-md-4"><input type="radio" class="btn-check" name="amount" id="amt-200" value="200000" data-gems="1000"><label class="btn btn-outline-secondary w-100 py-3" for="amt-200">200,000đ<br><small>1,000 Gem</small></label></div>
                        <div class="col-6 col-md-4"><input type="radio" class="btn-check" name="amount" id="amt-500" value="500000" data-gems="2500"><label class="btn btn-outline-secondary w-100 py-3" for="amt-500">500,000đ<br><small>2,500 Gem</small></label></div>
                      </div>
                    </div>

                    <div class="col-12 mt-4">
                      <button type="submit" class="btn btn-primary btn-lg w-100 py-3 fw-bold shadow">
                        <i class="bi bi-check2-circle me-2"></i> XÁC NHẬN ĐỔI THẺ
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}