var db = require('../config/connection');
var objectid=require('mongodb').ObjectID
var collection = require('../config/collections');
const bcrypt = require('bcrypt');
const collections = require('../config/collections');
require('dotenv').config();

module.exports = {
  
  addproduct: async (product,callback) => {
    db.get().collection('product').insertOne(product).then((data)=>{
      callback(data.ops[0]._id)
      console.log(data.insertedId)
    })},
     // Function to add a new admin
     addadmin: async (adminData, callback) => {
      // Proceed with adding the new admin if current admin is a super user
      db.get().collection(collection.ADMIN_COLLECTION).insertOne(adminData).then((data) => {
        callback(data.ops[0]._id);
      });
    },
    getallproducts:()=>{
      return new Promise(async(resolve,reject)=>{
        let products=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
        resolve(products)
      })
    },
    // Helper Method in product-helper.js
getTopProducts: async () => {
  return new Promise(async (resolve, reject) => {
      try {
          // Fetch products sorted by sales or views, adjust based on your data
          let topProducts = await db.get().collection(collection.PRODUCT_COLLECTION)
              .aggregate([
                  { $sort: { sales: -1 } },  // Sort by sales in descending order (you can change to 'views' if needed)
                  { $limit: 5 }  // Fetch top 5 products
              ])
              .toArray();

          resolve(topProducts);
      } catch (err) {
          reject(err);
      }
  });
},
getallorders: () => {
  return new Promise(async (resolve, reject) => {
      try {
          let orders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray();
          resolve(orders);
      } catch (err) {
          reject(err);
      }
  });
},

// Calculate total sales from all orders
getTotalSales: () => {
  return new Promise(async (resolve, reject) => {
      try {
          let sales = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
              {
                  $group: {
                      _id: null,
                      totalSales: { $sum: "$totalamount" }
                  }
              }
          ]).toArray();
          resolve(sales[0] ? sales[0].totalSales : 0);
      } catch (err) {
          reject(err);
      }
  });
},

// Fetch total number of products available in the system
getTotalProducts: () => {
  return new Promise(async (resolve, reject) => {
      try {
          let products = await db.get().collection(collection.PRODUCT_COLLECTION).countDocuments();
          resolve(products);
      } catch (err) {
          reject(err);
      }
  });
},
// Fetch top-selling products
getTopSellingProducts: () => {
  return new Promise(async (resolve, reject) => {
    try {
      let topProducts = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
        { $unwind: "$products" }, // Flatten the products array
        {
          $group: {
            _id: "$products.item", // Group by product ID
            totalSold: { $sum: "$products.quantity" } // Sum the quantity sold
          }
        },
        { $sort: { totalSold: -1 } }, // Sort in descending order
        { $limit: 5 }, // Get the top 5 best-selling products
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "productDetails"
          }
        },
        { $unwind: "$productDetails" }, // Flatten the product details array
        {
          $project: {
            name: "$productDetails.name",
            totalSold: 1
          }
        }
      ]).toArray();

      resolve(topProducts);
    } catch (err) {
      reject(err);
    }
  });
},


    deleteproduct:(proid)=>{
        return new Promise((resolve,reject)=>{
          db.get().collection(collection.PRODUCT_COLLECTION).removeOne({_id:objectid(proid)}).then((response)=>{
            resolve(response)
          })
        })
    },
    getproductdetails:(proid)=>{
      return new Promise((resolve,reject)=>{
        db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectid(proid)}).then((product)=>{
          resolve(product)
        })
      })
    },
    updateproduct:(proid, productdetails)=>{

      return new Promise((resolve,reject)=>{
        db.get().collection(collection.PRODUCT_COLLECTION).updateOne({_id:objectid(proid)},{
          $set:{
            name:productdetails.name,
            description:productdetails.description,
            price:productdetails.price,
            category:productdetails.category
          }
        }).then((response)=>{
          resolve(response)
        })
      })
    },
    getorderedproduct:()=>{
      return new Promise(async(resolve,reject)=>{
        let products=await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
        resolve(products)
      })
    },getallusers:()=>{
      return new Promise(async(resolve,reject)=>{
        let users=await db.get().collection(collection.USER_COLLECTION).find().toArray()
        resolve(users)
      })
    },
    getalluserss:()=>{
      return new Promise(async(resolve,reject)=>{
        let users=await db.get().collection(collection.USER_PASSWORD).find().toArray()
        resolve(users)
      })
    },
     changeproductstatus:(data) => {
      console.log(data)
      if(data.status == '1'){
        return new Promise((resolve, reject) => {
        db.get().collection(collection.ORDER_COLLECTION).removeOne({ _id: objectid(data.id) })
        .then((response) => {
          if (response.matchedCount === 0) {
              console.log('No documents matched the query. Please check the orderId:', data.orderId);
          }
          if (response.modifiedCount === 0 && response.matchedCount > 0) {
              console.log('The document was found but the status was already "hi".');
          }
          resolve(response);
          console.log('Update response:', response);
      })
      .catch((err) => {
          console.log('Error occurred while updating:', err);
          reject(err);
      });
});
    }
    else{
                return new Promise((resolve, reject) => {
                  db.get().collection(collections.ORDER_COLLECTION)
                      .updateOne( 
                          { _id: objectid(data.id) },
                          {
                              $set: {
                                  status: data.status
                              }
                          }
                      )
                      .then((response) => {
                          if (response.matchedCount === 0) {
                              console.log('No documents matched the query. Please check the orderId:', data.orderId);
                          }
                          if (response.modifiedCount === 0 && response.matchedCount > 0) {
                              console.log('The document was found but the status was already "hi".');
                          }
                          resolve(response);
                          console.log('Update response:', response);
                      })
                      .catch((err) => {
                          console.log('Error occurred while updating:', err);
                          reject(err);
                      });
              });
    }
  },
  
  dologin: (adminData) => {
    const storedAdminEmail = process.env.ADMIN_EMAIL;
    const storedAdminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
    console.log(storedAdminEmail,storedAdminPasswordHash);
    
    let admin=false
    return new Promise(async (resolve, reject) => {
      if(storedAdminEmail === adminData.email && storedAdminPasswordHash === adminData.password){
        resolve({ status: true, admin: {
          _id: '667fdf62fb47781040a6da6d',
          name: 'superuser',
          superuser: true,
          email: 'superuser@gmail.com',
          password: '$2b$10$4ElBDHMper90YCRBtOneW.Q26AZI2GNRwuFcbyjqHQ1NFLxCchNP2',
          
        } });
      }
      else{
       admin = await db.get().collection(collection.ADMIN_COLLECTION).findOne({ email: adminData.email });
      
      if (admin) {
        bcrypt.compare(adminData.password, admin.password, (err, isMatch) => {
          if (isMatch) {
            resolve({ status: true, admin: admin });
          } else {
            resolve({ status: false });
          }
        });
      } else {
        resolve({ status: false });
      }
    }
    });
  },
  getalladmins:()=>{
    return new Promise(async(resolve,reject)=>{
      let admins=await db.get().collection(collection.ADMIN_COLLECTION).find().toArray()
      resolve(admins)
    })
},
deleteadmin:(adminid)=>{
  return new Promise(async(resolve,reject)=>{
db.get().collection(collection.ADMIN_COLLECTION).removeOne({ _id: objectid(adminid) })
  resolve()
})

},
deleteuser:(userid)=>{
  return new Promise(async(resolve,reject)=>{
db.get().collection(collection.USER_COLLECTION).removeOne({ _id: objectid(userid) })
  resolve()
})
},
deleteusers:(userid)=>{
  return new Promise(async(resolve,reject)=>{
db.get().collection(collection.USER_PASSWORD).removeOne({ _id: objectid(userid) })
  resolve()
})
}


}
