var db = require('../config/connection');
var collection = require('../config/collections');
var objectid=require('mongodb').ObjectID
    

module.exports = {
  
  addproduct: async (product,callback) => {
    db.get().collection('product').insertOne(product).then((data)=>{
      callback(data.ops[0]._id)
      console.log(data.insertedId)
    })
 
  
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
    }



  }
    

