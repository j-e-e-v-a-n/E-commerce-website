var db = require('../config/connection');
var collection = require('../config/collections');
const bcrypt = require('bcrypt');
var objectid = require('mongodb').ObjectID
const { response } = require('express');
const { ObjectId } = require('mongodb');
const { resolve } = require('path');
const { totalmem } = require('os');
const { rejects } = require('assert');
const Razorpay = require('razorpay');
const collections = require('../config/collections');
var instance = new Razorpay({
    key_id: 'rzp_test_IvGWMBpENteAE2',
    key_secret: 'tH4vJwFji3WLnDms9bT9sPyL'
})

module.exports = {
    dosignup: (userdata) => {
        return new Promise(async (resolve, reject) => {
            userdata.password = await bcrypt.hash(userdata.password, 10)
            db.get().collection(collection.USER_COLLECTION).insertOne(userdata).then((data) => {
                resolve(data.ops[0])
            })
        })

    },
    dologin: (userdata) => {
        return new Promise(async (resolve, reject) => {
            let loginstatus = false
            let response = {}
            let user = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userdata.email })
            if (user) {
                bcrypt.compare(userdata.password, user.password).then((status) => {
                    if (status) {
                        response.user = user
                        response.status = true
                        resolve(response)
                        console.log('Login success');
                    } else {
                        console.log('Login failed')
                        resolve({ status: false })
                    }
                })
            }
            else {
                console.log('Login failed')
                resolve({ status: false })
            }
        })
    },
    addtocart: (proid, userid) => {
        let proobj = {
            item: ObjectId(proid),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            let usercart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectid(userid) })
            if (usercart) {
                let proexist = usercart.product.findIndex(product => product.item == proid)
                console.log(proexist);
                if (proexist != -1) {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectid(userid), 'product.item': objectid(proid) },
                            {
                                $inc: { 'product.$.quantity': 1 }

                            }).then(() => {
                                resolve()
                            })
                }
                else {
                    db.get().collection(collection.CART_COLLECTION)
                        .updateOne({ user: objectid(userid) }, {
                            $push: { product: proobj }

                        }
                        ).then(() => {
                            resolve(response)
                        })
                }
            } else {
                let cartobj = {
                    user: objectid(userid),
                    product: [proobj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartobj).then(() => {
                    resolve(response)
                })
            }
        })
    },
    getcartproducts: (userid) => {
        return new Promise(async (resolve, reject) => {
            let cartitems = await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match: { user: objectid(userid) }
                }, {
                    $unwind: '$product'
                }, {
                    $project: {
                        item: '$product.item',
                        quantity: '$product.quantity'
                    }
                }, {
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'product'
                    }

                }, {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$product', 0] }
                    }
                }

            ]).toArray()
            if (cartitems) {
                resolve(cartitems)
            }
        })
    },
    getcartcount: (userid) => {
        return new Promise(async (resolve, reject) => {
            let count = 0;
            try {
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectid(userid) });
                if (cart && cart.product) {
                    count = cart.product.length;
                }
            } catch (error) {
                reject(error);
            }
            resolve(count);
        });
    },
    changeproductquantity: (details) => {
        details.count = parseInt(details.count);
        details.quantity = parseInt(details.quantity);

        return new Promise((resolve, reject) => {
            if (details.count === -1 && details.quantity === 1 || details.remove === 1) {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne(
                        { _id: ObjectId(details.cart) },
                        { $pull: { product: { item: ObjectId(details.product) } } }
                    )
                    .then((response) => {
                        resolve({ removeproduct: true });
                    })
                    .catch((err) => {
                        reject(err);
                    });
            } else {
                db.get().collection(collection.CART_COLLECTION)
                    .updateOne(
                        { _id: ObjectId(details.cart), 'product.item': ObjectId(details.product) },
                        { $inc: { 'product.$.quantity': details.count } }
                    )
                    .then((response) => {
                        resolve({ status: true });
                    })
                    .catch((err) => {
                        reject(err);
                    });
            }
        });
    },
    gettotalamount: (userid) => {
        return new Promise(async (resolve, reject) => {
            try {
                let total = await db.get().collection(collection.CART_COLLECTION).aggregate([
                    {
                        $match: { user: objectid(userid) }
                    },
                    {
                        $unwind: '$product'
                    },
                    {
                        $project: {
                            item: '$product.item',
                            quantity: '$product.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: collection.PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'product'
                        }
                    },
                    {
                        $project: {
                            item: 1,
                            quantity: 1,
                            product: { $arrayElemAt: ['$product', 0] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: {
                                $sum: {
                                    $multiply: [
                                        { $toDouble: '$quantity' },    // Convert quantity to double if it's a string
                                        { $toDouble: '$product.price' } // Convert product.price to double if it's a string
                                    ]
                                }
                            }
                        }
                    }
                ]).toArray();

                if (total.length > 0 && total[0].total) {
                    resolve(total[0].total);
                } else {
                    resolve(0); // Resolve 0 if there are no items in the cart
                }
            } catch (err) {
                reject(err);
            }
        });
    },
    placeorder: (order, product, total) => {
        console.log(order, product, total)
        return new Promise((resolve, reject) => {
            let status = order['payment-method'] === 'COD' ? 'Order placed' : 'pending'
            let orderobj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userid: objectid(order.userid),
                paymentmethod: order['payment-method'],
                products: product,
                totalamount: total,
                status: status,
                date: new Date()
            }
            db.get().collection(collection.ORDER_COLLECTION).insertOne(orderobj).then((response) => {
                db.get().collection(collection.CART_COLLECTION).removeOne({ user: objectid(order.userid) })
                resolve(response.ops[0]._id)
            })
        })

    },
    getcartproductlist: (userid) => {
        return new Promise(async (resolve, reject) => {
            try {
                let cart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: objectid(userid) });
                if (cart) {
                    resolve(cart.product);
                } else {
                    resolve([]); // or resolve with an appropriate default value
                }
            } catch (error) {
                reject(error);
            }
        });
    },
    
    getallorders: (userid) => {
        return new Promise(async (resolve, reject) => {
            console.log(userid);
            let orders = await db.get().collection(collection.ORDER_COLLECTION)
                .find({ userid: objectid(userid) }).toArray()
            console.log(orders);
            resolve(orders)
        })
    },
    getorderproducts: (orderid) => {
        return new Promise(async (resolve, reject) => {
            let orderitems = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match: { _id: objectid(orderid) }
                },
                {
                    $unwind: '$products' 
                },
                { 
                    $project: {
                        item: '$products.item',
                        quantity: '$products.quantity'
                    }
                },
                { 
                    $lookup: {
                        from: collection.PRODUCT_COLLECTION,
                        localField: 'item',
                        foreignField: '_id',
                        as: 'products'
                    }
                },
                {
                    $project: {
                        item: 1,
                        quantity: 1,
                        product: { $arrayElemAt: ['$products', 0] }
                    }
                },
            ]).toArray();
            if (orderitems.length === 0) {
                console.log('No order items found for the given order ID.');
            }
            console.log(orderitems)
            resolve(orderitems);

        });
    },
    generateRazorpay: (orderId, total) => {
        return new Promise((resolve, reject) => {
            var options = {
                amount: total*100, // amount in the smallest currency unit
                currency: "INR",
                receipt: orderId.toHexString()
            }
            console.log(options);

            instance.orders.create(options, function (err, order) {
                console.log("order", order);
                resolve(order)
            });
        })
    },
    verifyPayment: (details) => {
        return new Promise((resolve, reject) => {
            const crypto = require('crypto');
            let hmac = crypto.createHmac('sha256', 'tH4vJwFji3WLnDms9bT9sPyL')
            hmac.update(details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]'])
            hmac = hmac.digest('hex')
            if (hmac == details['payment[razorpay_signature]']) {
                resolve()
            } else {
                reject()
            }

        })
    },
    changepaymentstatus: (orderid) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collections.ORDER_COLLECTION)
                .updateOne(
                    { _id: objectid(orderid) },
                    {
                        $set: {
                            status: 'Placed'
                        }
                    }
                )
                .then(() => {
                    resolve();  // Correctly calling resolve
                })
                .catch((err) => {
                    reject(err);  // Rejecting in case of an error
                });
        });
    }
    
}





