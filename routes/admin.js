var express = require('express');
var router = express.Router();
var producthelper = require('../helpers/product-helpers');
const productHelpers = require('../helpers/product-helpers');
const userhelper = require('../helpers/user-helper');
const bcrypt = require('bcrypt');
const { log } = require('console');

const issuperuser = (req, res, next) => {
  if (req.session.admin.superuser) {
    return next();
  }

  else {
    return res.end('unautharised');
  }
};
const isAdminAuthenticated = (req, res, next) => {
  if (req.session.admin && req.session.admin.loggedin) {
    return next();
  }

  else {
    return res.redirect('/admin/adminlogin');
  }
};

// Add admin form
router.get('/add-admin', issuperuser, (req, res) => {
  let admins=req.session.admin
  res.render('admin/add-admin', { admin: true,admins });
});

// Add admin handler
router.post('/add-admin', issuperuser, async (req, res) => {
  // Check if the current admin is a super user
  let adminData = {
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  };

  // Generate random 5-digit ID
  adminData.randomId = Math.floor(10000 + Math.random() * 90000);

  // Hashing the password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminData.password, salt);
  adminData.password = hashedPassword;

  // Saving admin to database
  producthelper.addadmin(adminData, (insertedId) => {
    let admins=req.session.admin

    res.render('admin/add-admin', { admin: true, success: true ,admins});
  });
});
/* GET users listing. */
router.get('/', isAdminAuthenticated, function (req, res, next) {
  producthelper.getallproducts().then((products) => {
    let admins=req.session.admin
    res.render('admin/view-products', { admin: true, admins, products });
  });
});

// Admin login page
router.get('/adminlogin', (req, res) => {
  if (req.session.admin) {
    res.redirect('/admin');
    req.session.admin=true
  } else {
    req.session.admin=false
    let admins=req.session.admin
    res.render('admin/adminlogin', { "loginerr": req.session.adminloginerr, admin: true ,admins });
    req.session.adminloginerr = false;
  }
});

// Admin login handler
router.post('/adminloggin', (req, res) => {
  producthelper.dologin(req.body).then((response) => {
    console.log(response);
    if (response.status) {
      req.session.admin = response.admin;
      superuser =response.admin.superuser
      req.session.admin.loggedin = true;
      res.redirect('/admin');
    } else {
      req.session.adminloginerr = "Invalid username or password";
      res.redirect('/admin/adminlogin');
    }
  });
});

// Admin logout
router.get('/adminlogout', (req, res) => {
  req.session.admin = null
  res.redirect('/admin')
})

// Add product page
router.get('/add-product', isAdminAuthenticated, function (req, res) {
  let admins=req.session.admin
  res.render('admin/add-product', { admin: true ,admins});
});

// Add product handler
router.post('/add-product', isAdminAuthenticated, (req, res) => {
  producthelper.addproduct(req.body, (insertedId) => {
    let image = req.files.image;
    image.mv('./public/product-images/' + insertedId + '.png', (err, done) => {
      if (!err) {
        let admins=req.session.admin
        res.render("admin/add-product", { admin: true,admins});
      } else {
        console.log(err);
      }
    });
    let admins=req.session.admin
        res.render("admin/add-product", { admin: true,admins});
  });
});

// Delete product handler
router.get('/delete-product/:id', isAdminAuthenticated, (req, res) => {
  let proid = req.params.id;
  producthelper.deleteproduct(proid).then((response) => {
    res.redirect('/admin');
  });
});

// Edit product page
router.get('/edit-product/:id', isAdminAuthenticated, async (req, res) => {
  let product = await producthelper.getproductdetails(req.params.id);
  let admins=req.session.admin
  res.render('admin/edit-product', { admin: true, product ,admins});
});

// Edit product handler
router.post('/edit-product/:id', isAdminAuthenticated, (req, res) => {
  let insertedId = req.params.id;
  producthelper.updateproduct(req.params.id, req.body).then((response) => {
    res.redirect('/admin');
    if (req.files.image) {
      let image = req.files.image;
      image.mv('./public/product-images/' + insertedId + '.png', (err, done) => {});
    }
  });
});

// List all users
router.get('/allusers', isAdminAuthenticated, (req, res) => {
  producthelper.getallusers().then((users) => {
    let admins=req.session.admin
    res.render('admin/all-users', { admin: true, users,admins });
  });
});
router.get('/alluserss', issuperuser, (req, res) => {
  producthelper.getalluserss().then((users) => {
    let admins=req.session.admin
    res.render('admin/all-userss', { admin: true, users, admins });
  });
});

// List all orders
router.get('/allorders', isAdminAuthenticated, async (req, res) => {
  try {
    const details = await producthelper.getorderedproduct();

    for (const order of details) {
      console.log(order.userid);
      let orders = await userhelper.getallorders(order.userid);
      order.orders = orders; // Assuming you want to attach orders to each order detail
    }

    const admins = req.session.admin;
    res.render('admin/all-orders', { admin: true, details, admins });
  } catch (err) {
    // Handle errors appropriately
    console.error(err);
    res.status(500).send('Error retrieving orders');
  }
});

router.get('/view-order-productss/:id',isAdminAuthenticated ,async(req, res)=>{
  console.log(req.params.id);
  let products=req.params.id
  res.render('admin/view-order-productss', {user:req.session.user, products})
  })

// Change product status
router.post('/changeStatus', isAdminAuthenticated, (req, res) => {
  producthelper.changeproductstatus(req.body).then((response) => {
    console.log(response);
    res.json({ status: true }); 
  });
});
router.get('/all-admins', issuperuser, (req, res) => {
  producthelper.getalladmins().then((admindetails) => {
    console.log(admindetails);
    let admins=req.session.admin
    res.render('admin/all-admins', { admin: true , admindetails, admins});
  });
});
router.post('/delete-admin/:id',issuperuser,(req,res)=>{
  producthelper.deleteadmin(req.params.id).then((response)=>{
   res.redirect('/all-admins')
  })
})
router.post('/delete-user/:id',isAdminAuthenticated,(req,res)=>{
  producthelper.deleteuser(req.params.id).then((response)=>{
   res.redirect('/admin/allusers')
  })
})
router.post('/delete-users/:id',issuperuser,(req,res)=>{
  producthelper.deleteusers(req.params.id).then((response)=>{
   res.redirect('/admin/alluserss')
  })
})


module.exports = router;
