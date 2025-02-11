var express = require('express');
var router = express.Router();
var producthelper = require('../helpers/product-helpers')
const userhelper = require('../helpers/user-helper');
const { log } = require('console');
const verifylogin = (req, res, next) => {
  console.log(req.session);
  console.log(req.session.user)
  if (req.session.user) {
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
  if (req.session.user) {
    res.redirect('/')
  } else {
    res.render('user/login', { "loginerr": req.session.userloginerr })
    req.session.userloginerr = false
  }
})
router.get('/signup', (req, res) => {
  const userexist = req.session.userexist || '';
  req.session.userexist = false // Reset the message after reading it
  res.render('user/signup', { 'userexist': userexist });
});

router.post('/signup', async (req, res) => {
  try {
    const response = await userhelper.dosignup(req.body);
    console.log(response);
    req.session.user = response;
    res.redirect('/');
  } catch (err) {
    console.error(err);
    req.session.userexist = "Account already exists in this E-mail. Please login.";
    res.redirect('/signup');
  }
});

router.post('/login', (req, res) => {
  userhelper.dologin(req.body).then((response) => {
    if (response.status) {
      req.session.user = response.user
      req.session.user.loggedin = true
      res.redirect('/')
    }
    else {
      req.session.userloginerr = "Invalid username or password"
      res.redirect('/login')
    }
  })
})
router.get('/logout', (req, res) => {
  req.session.user = null
  res.redirect('/')
})
router.get('/cart', verifylogin, async (req, res) => {
  let user = req.session.user
  console.log("cart")
  let product = await userhelper.getcartproducts(req.session.user._id)
  let total=0
  if(product.length>0){
   total = await userhelper.gettotalamount(req.session.user._id)
  }
  res.render('user/cart', { product, userid: req.session.user._id,total,user })
})
router.get('/add-to-cart/:id',verifylogin, (req, res) => {
  console.log(req.session);
  console.log(req.session.user)
  if (req.session.user) {
    console.log(req.session.loggedin)
    console.log(req.session.user);
    userhelper.addtocart(req.params.id, req.session.user._id).then(() => {
      res.json({ status: true })
  
    })
  } else {
    res.redirect('/login')
  }
 
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
  try {
      let products = await userhelper.getcartproducts(req.body.userid);

      if (!products || products.length === 0) {
          return res.status(400).json({ error: 'Cart is empty' });
      }

      let totalprice = await userhelper.gettotalamount(req.body.userid);

      // Place the order
      userhelper.placeorder(req.body, products, totalprice)
          .then((orderid) => {
              console.log("Order placed successfully:", orderid);  // Add log for order placement

              if (req.body['payment-method'] === 'COD') {
                  res.json({ COD_success: true });
              } else {
                  // Handle Razorpay payment
                  userhelper.generateRazorpay(orderid, totalprice)
                      .then((response) => {
                          console.log("Razorpay payment response:", response);  // Add log for Razorpay response
                          res.json(response);
                      })
                      .catch((error) => {
                          console.error("Error in generateRazorpay:", error);
                          res.status(500).json({ error: "Payment processing error" });
                      });
              }
          })
          .catch((error) => {
              console.error("Error in placing order:", error);
              res.status(500).json({ error: "Failed to place order" });
          });

  } catch (error) {
      console.error("Error in /place-order:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});



router.get('/ordersuccess',verifylogin,(req,res)=>{
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
  res.render('user/view-order-products', {user:req.session.user, products})
  })
  router.post('/verify-payment', (req, res) => {
    console.log(req.body);
    userhelper.verifyPayment(req.body).then(() => {
        userhelper.changepaymentstatus(req.body['order[receipt]']).then(() => {
          console.log('payment sucessfull');
            res.json({ status: true });
        })
    }).catch((err) => {
      console.log(err);
        res.json({ status: false });
    });
});


module.exports = router;
