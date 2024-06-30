function addToCart(proid) {
  console.log('addtocart function called with proid:', proid);
  $.ajax({
    url: '/add-to-cart/' + proid,
    method: 'GET',
    success: (response) => {
      if (response.status) {
        let count = $('#cart-count').html();
        count = parseInt(count) + 1;
        $("#cart-count").html(count);
      }
    },
    error: (xhr, status, error) => {
      console.error('AJAX error:', status, error);
    }
  });
}
