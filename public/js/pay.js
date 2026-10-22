/* Component 8 front-end: HTML form -> Node.js /api/debit */
$(function () {
  var q = new URLSearchParams(location.search), s = TF.session();
  $('#acc').val(q.get('acc') || (s && s.accountNo) || ''); if (q.get('amt')) $('#amt').val(q.get('amt'));
  function bal() {
    var a = $.trim($('#acc').val()); if (!a) return;
    TF.api('/api/account/' + encodeURIComponent(a)).then(function (r) {
      if (r.error) { $('#bal').text('-'); $('#balAcc').text(r.error); } else { $('#bal').html('&#8377;' + r.balance); $('#balAcc').text('Account ' + r.accountNo); }
    });
  }
  function hist() {
    var a = $.trim($('#acc').val()); if (!a) return;
    TF.api('/api/transactions/' + encodeURIComponent(a)).then(function (rows) {
      if (!Array.isArray(rows)) return;
      $('#hist tbody').html(rows.length ? rows.map(function (t) { return '<tr><td>' + $('<i>').text(t.purpose).html() + '</td><td>&#8377;' + t.amount + '</td><td>&#8377;' + t.balanceAfter + '</td></tr>'; }).join('') : '<tr><td colspan="3" class="muted">No debits yet.</td></tr>');
    });
  }
  $('#check').on('click', function () { bal(); hist(); });
  $('#debitForm').on('submit', function (e) {
    e.preventDefault();
    var acc = $.trim($('#acc').val()), amt = Number($('#amt').val());
    if (!acc) return $('#msg').html('<span class="err">Account number is required</span>');
    if (!(amt > 0)) return $('#msg').html('<span class="err">Enter an amount above zero</span>');
    TF.api('/api/debit', { method: 'POST', body: { accountNo: acc, amount: amt, purpose: $('#purpose').val() } }).then(function (r) {
      if (r.ok) { $('#msg').html('<span class="badge good">Debited &#8377;' + r.debited + '</span>'); $('#bal').html('&#8377;' + r.balance); $('#balAcc').text('Account ' + r.accountNo); hist(); }
      else $('#msg').html('<span class="err">' + r.error + (r.balance !== undefined ? ' (balance &#8377;' + r.balance + ')' : '') + '</span>');
    });
  });
  if ($('#acc').val()) { bal(); hist(); }
});
