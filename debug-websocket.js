// Debug script - paste this in browser console to check WebSocket status

console.log('=== WebSocket Debug Info ===');

// Check if websocketService exists
if (window.websocketService) {
    console.log('WebSocket Service found');
    console.log('Connected:', window.websocketService.isConnected());
    console.log('Subscriptions:', window.websocketService.subscriptions);
} else {
    console.log('WebSocket Service NOT found');
}

// Check CallService
if (window.CallService) {
    console.log('CallService found');
    console.log('Current call:', window.CallService.getCurrentCall());
} else {
    console.log('CallService NOT found');
}

// Check session
const session = JSON.parse(localStorage.getItem('session'));
console.log('Session:', session);

// Manual test subscription
console.log('\n=== Testing Manual Subscription ===');
console.log('Try subscribing to: /topic/call.audio.' + session.userId);
