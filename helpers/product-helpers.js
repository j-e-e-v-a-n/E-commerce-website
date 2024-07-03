var db = require('../config/connection');
var objectid=require('mongodb').ObjectID
var collection = require('../config/collections');
const bcrypt = require('bcrypt');
const collections = require('../config/collections');

module.exports = {
  
  addproduct: async (product,callback) => {
    db.get().collection('product').insertOne(product).then((data)=>{
      callback(data.ops[0]._id)
      console.log(data.insertedId)
    })
 
  
    },
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
    let admin=false
    return new Promise(async (resolve, reject) => {
      if('superuser@gmail.com' == adminData.email && 'superuser' == adminData.password){
        resolve({ status: true, admin: {
          _id: '667fdf62fb47781040a6da6d',
          name: 'superuser',
          superuser: true,
          email: 'superuser@gmail.com',
          password: '$2b$10$4ElBDHMper90YCRBtOneW.Q26AZI2GNRwuFcbyjqHQ1NFLxCchNP2',
          randomId: 60179
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
