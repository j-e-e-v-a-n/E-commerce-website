var express = require('express');
var router = express.Router();
var producthelper = require('../helpers/product-helpers')
/* GET users listing. */
router.get('/', function (req, res, next) {
  producthelper.getallproducts().then((products) => {
    console.log(products);
    res.render('admin/view-products', { admin: true, products });
  })
});
router.get('/add-product', function (req, res) {
  res.render('admin/add-product', { admin: true })
})
router.post('/add-product', (req, res) => {
  producthelper.addproduct(req.body, (insertedId) => {
    let image = req.files.image
    image.mv('./public/product-images/' + insertedId + '.png', (err, done) => {
      if (!err) {
        res.render("admin/add-product")
      }
      else {
        console.log(err);
      }
    })
    res.render("admin/add-product")
  })

})
router.get('/delete-product/:id', (req, res) => {
  let proid = req.params.id
  producthelper.deleteproduct(proid).then((response) => {
    res.redirect('/admin')
  })
})
router.get('/edit-product/:id', async (req, res) => {
  let product = await producthelper.getproductdetails(req.params.id)
  res.render('admin/edit-product', { admin: true, product })
})
router.post('/edit-product/:id', (req, res) => {
  let insertedId = req.params.id
  producthelper.updateproduct(req.params.id, req.body).then((response) => {
    res.redirect('/admin')
    if (req.files.image) {
      let image = req.files.image
      image.mv('./public/product-images/' + insertedId + '.png', (err, done) => {

      })
    }
  })
})


module.exports = router;
