/* Component 6 - AngularJS shopping cart */
angular.module('kitApp', []).controller('KitCtrl', ['$http', function ($http) {
  var vm = this;
  vm.items = []; vm.categories = []; vm.category = ''; vm.search = ''; vm.cart = []; vm.submitted = false; vm.msg = '';
  var s = null; try { s = JSON.parse(sessionStorage.getItem('tf_session') || 'null'); } catch (e) {}
  vm.account = s ? s.accountNo : '';

  $http.get('data/kit.json').then(function (r) {
    vm.items = r.data.map(function (i) { i.selected = false; i.qty = 1; return i; });
    vm.categories = Array.from(new Set(vm.items.map(function (i) { return i.category; })));
  });
  // Correlation with the Teams page: recommend items for the skills your team is missing
  vm.gaps = []; vm.hint = '';
  var LABEL = { fe: 'Frontend', be: 'Backend', ml: 'Data / AI', ux: 'Design / UX', hw: 'Hardware / IoT', pm: 'Pitch / Domain' };
  if (s && s.token) $http.get('/api/teams/mine', { headers: { Authorization: 'Bearer ' + s.token } }).then(function (r) {
    vm.gaps = (r.data && r.data.gapKeys) || [];
    vm.hint = !r.data.team ? 'Teams are not built yet, so there are no recommendations.' : vm.gaps.length ? r.data.name + ' is missing: ' + vm.gaps.map(function (g) { return LABEL[g]; }).join(', ') + '. Recommended items are tagged.' : r.data.name + ' covers all six skills - pick whatever you like.';
  });
  vm.isRec = function (it) { return it.topic === 'mentor' ? vm.gaps.length > 0 : !!it.topic && vm.gaps.indexOf(it.topic) > -1; };
  vm.touch = function (it) { if (it.selected && !it.qty) it.qty = 1; };
  vm.selected = function () { return vm.items.filter(function (i) { return i.selected; }); };
  vm.submit = function () {
    vm.cart = vm.selected().map(function (i) { return { name: i.name, price: i.price, qty: Math.max(1, Number(i.qty) || 1) }; });
    vm.submitted = true; vm.msg = '';
  };
  vm.total = function () { return vm.cart.reduce(function (t, i) { return t + i.price * i.qty; }, 0); };
  vm.clear = function () { vm.items.forEach(function (i) { i.selected = false; i.qty = 1; }); vm.cart = []; vm.submitted = false; vm.msg = ''; };
  vm.pay = function () {
    vm.paying = true;
    $http.post('/api/debit', { accountNo: vm.account, amount: vm.total(), purpose: 'Resource kit' }).then(function (r) {
      vm.msgOk = true; vm.msg = 'Paid. New balance: ₹' + r.data.balance; vm.paying = false;
    }, function (e) { vm.msgOk = false; vm.msg = (e.data && e.data.error) || 'Payment failed'; vm.paying = false; });
  };
}]);
