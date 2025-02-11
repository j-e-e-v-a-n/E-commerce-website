var express = require('express');
var router = express.Router();
var producthelper = require('../helpers/product-helpers');
const productHelpers = require('../helpers/product-helpers');
const userhelper = require('../helpers/user-helper');
const bcrypt = require('bcrypt');
const saltRounds = 10; // you can adjust the number of salt rounds as needed
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

  try {
    // Hash the password
    adminData.password = await bcrypt.hash(adminData.password, saltRounds);

    // Saving admin to database
    producthelper.addadmin(adminData, (insertedId) => {
      let admins = req.session.admin;
      res.render('admin/add-admin', { admin: true, success: true, admins });
    });
  } catch (error) {
    console.error("Error hashing password: ", error);
    res.status(500).send('Internal Server Error');
  }
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

router.get('/statistics', isAdminAuthenticated, async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.status(401).send('Unauthorized access');
    }

    // Fetch necessary data
    let orders = await producthelper.getallorders();
    let sales = await producthelper.getTotalSales();
    let products = await producthelper.getTotalProducts();
    let topProducts = await producthelper.getTopSellingProducts();

    console.log("Fetched Orders:", orders);
    console.log("Total Sales:", sales);
    console.log("Total Products:", products);
    console.log("Top Selling Products:", topProducts);

    // Ensure data is available
    if (!orders || !sales || !products) {
      return res.status(404).send('Data not found');
    }

    // Sales by Month Calculation
    let salesByMonth = {}; 
    let months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    orders.forEach(order => {
      console.log("Order Date:", order.date); // Debugging

      if (!order.date || !order.totalAmount) return;  // Ignore invalid data

      let orderDate = new Date(order.date);
      if (isNaN(orderDate.getTime())) {
        console.log("Invalid Order Date:", order.date); // Debugging
        return;
      }

      let monthName = months[orderDate.getMonth()];
      if (!salesByMonth[monthName]) {
        salesByMonth[monthName] = 0;
      }

      const totalAmount = parseFloat(order.totalAmount) || 0;
      salesByMonth[monthName] += totalAmount;
    });

    console.log("Sales by Month:", salesByMonth); // Debugging

    // Convert salesByMonth object to an array
    const salesData = Object.keys(salesByMonth).map(month => ({
      month: month,
      sales: salesByMonth[month]
    }));

    // Calculate total products sold
    const totalProductsSold = orders.reduce((sum, order) => {
      console.log("Order Items:", order.items); // Debugging
      return sum + ((order.items || []).length);
    }, 0);

    console.log("Total Products Sold:", totalProductsSold); // Debugging

    // Count active users (users who placed at least one order)
    const activeUsers = new Set(orders.map(order => order.userId)).size;

    res.render('admin/sales-statistics', {
      totalSalesCurrentMonth: sales,
      salesData: salesData,
      totalProductsSold: totalProductsSold,
      totalOrders: orders.length,
      activeUsers: activeUsers,
      topProducts: topProducts,
      admin: true
    });

  } catch (err) {
    console.error('Error in statistics route:', err);
    res.status(500).send('Server error');
  }
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
   res.redirect('/admin')
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
