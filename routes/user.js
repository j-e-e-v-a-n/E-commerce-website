var express = require('express');
var router = express.Router();
var producthelper = require('../helpers/product-helpers')
const userhelper = require('../helpers/user-helper');
const { log } = require('console');
const verifylogin = (req, res, next) => {
  if (req.session.loggedin) {
    next()
  } else {
    res.redirect('/login')
  }

}
/* GET home page. */
router.get('/', async function (req, res, next) {
  let user = req.session.user
  let cartcount = null
  if (req.session.user) {
    cartcount = await userhelper.getcartcount(req.session.user._id)
  }
  producthelper.getallproducts().then((products) => {
    console.log(user);
    res.render('user/view-product', { products, user, cartcount });
  })
});
router.get('/login', (req, res) => {
  console.log(req.session.loggedin)
  if (req.session.loggedin) {
    res.redirect('/')
  } else {
    res.render('user/login', { "loginerr": req.session.loginerr })
    req.session.loginerr = null
  }
})
router.get('/signup', (req, res) => {
  res.render('user/signup')
})
router.post('/signup', (req, res) => {
  userhelper.dosignup(req.body).then((response) => {
    console.log(response);
    req.session.loggedin = true
    req.session.user = response
    user = true
    res.redirect('/')
  })
})
router.post('/login', (req, res) => {
  userhelper.dologin(req.body).then((response) => {
    if (response.status) {
      req.session.loggedin = true
      req.session.user = response.user
      res.redirect('/')
    }
    else {
      req.session.loginerr = "Invalid username or password"
      res.redirect('/login')
    }
  })
})
router.get('/logout', (req, res) => {
  req.session.destroy()
  res.redirect('/')
})
router.get('/cart', verifylogin, async (req, res) => {
  console.log("cart")
  let total = await userhelper.gettotalamount(req.session.user._id)
  let product = await userhelper.getcartproducts(req.session.user._id)
  res.render('user/cart', { product, user: req.session.user._id,total })
})
router.get('/add-to-cart/:id',verifylogin, (req, res) => {
  userhelper.addtocart(req.params.id, req.session.user._id).then(() => {
    res.json({ status: true })

  })
})
router.post('/change-product-quantity', (req, res, next) => {
  console.log(req.body);

  console.log("router called");

  userhelper.changeproductquantity(req.body)
    .then(async (response) => {
      response.total=await userhelper.gettotalamount(req.body.user)
    res.json(response)
    })
});
router.get('/check-out', verifylogin,async(req,res,next)=>{
  let total=await userhelper.gettotalamount(req.session.user._id)
  console.log(total)
  res.render('user/place-order', {total, user:req.session.user._id })

})
router.post('/place-order', async (req, res) => {
  let products = await userhelper.getcartproductlist(req.body.userid)
  let totalprice =await userhelper.gettotalamount(req.body.userid)
  userhelper.placeorder(req.body,products,totalprice).then((orderid)=>{
    if(req.body['payment-method']=='COD'){
      res.json({COD_success:true})
      }else{
      userhelper.generateRazorpay(orderid,totalprice).then((response)=>{
        res.json(response)
        
      })  
      }
  })
  
});
router.get('/ordersuccess',(req,res)=>{
 res.render('user/order-success' , {user:req.session.user})
})
router.get('/orders' ,verifylogin ,async(req,res)=>{
  console.log(req.session.user);
  let orders=await userhelper.getallorders(req.session.user._id)
  console.log(orders)
  res.render('user/orders',{user:req.session.user, orders})
})
router.get('/view-order-products/:id',verifylogin ,async(req, res)=>{
  let products=await userhelper.getorderproducts(req.params.id)
  console.log(products);
  res.render('user/view-order-products', {user:req.session.user, products})
  })
  router.post('/verify-payment', (req, res) => {
    console.log(req.body);
    userhelper.verifyPayment(req.body).then(() => {
        userhelper.changepaymentstatus(req.body['order[receipt]']).then(() => {
          console.log('pyment sucessfull');
            res.json({ status: true });
        })
    }).catch((err) => {
      console.log(err);
        res.json({ status: false });
    });
});


module.exports = router;
