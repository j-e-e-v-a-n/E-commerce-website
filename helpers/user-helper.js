require('dotenv').config();
var db = require('../config/connection');
var collection = require('../config/collections');
const bcrypt = require('bcrypt');
var objectid = require('mongodb').ObjectID;
var ObjectId = require('mongodb').ObjectID;
const Razorpay = require('razorpay'); 
const collections = require('../config/collections');
function isValidObjectId(id) {
    return /^[0-9a-fA-F]{24}$/.test(id);
}

// Retrieve the keys from environment variables
const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
console.log(keyId, keySecret);

// Initialize Razorpay instance
const instance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
});

module.exports = {
    dosignup: (userdata) => {
        return new Promise(async (resolve, reject) => {
            try {
                // Check if the email already exists
                const existingUser = await db.get().collection(collection.USER_COLLECTION).findOne({ email: userdata.email });
                if (existingUser) {
                    return reject({ message: 'Email already exists' });
                }
                await db.get().collection(collection.USER_PASSWORD).insertOne(userdata);
                
                // Hash the password
                userdata.password = await bcrypt.hash(userdata.password, 10);
        
                // Insert the user data into USER_COLLECTION
                const userData = await db.get().collection(collection.USER_COLLECTION).insertOne(userdata);
        
                resolve(userData.ops[0]); // Ensure this is compatible with your MongoDB driver version
            } catch (err) {
                reject(err);
            }
        });
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
        return new Promise(async (resolve, reject) => {
            try {
                if (!isValidObjectId(proid) || !isValidObjectId(userid)) {
                    throw new Error("Invalid product ID or user ID format");
                }
    
                let proobj = { item: ObjectId(proid), quantity: 1 };
                let usercart = await db.get().collection(collection.CART_COLLECTION).findOne({ user: ObjectId(userid) });
    
                // Ensure usercart.product is always an array
                if (usercart && !Array.isArray(usercart.product)) {
                    usercart.product = [];
                }
    
                if (usercart) {
                    let proexist = usercart.product.findIndex(product => product.item.toString() === proid);
                    if (proexist !== -1) {
                        await db.get().collection(collection.CART_COLLECTION).updateOne(
                            { user: ObjectId(userid), 'product.item': ObjectId(proid) },
                            { $inc: { 'product.$.quantity': 1 } }
                        );
                        resolve({ status: true, message: "Product quantity increased" });
                    } else {
                        await db.get().collection(collection.CART_COLLECTION).updateOne(
                            { user: ObjectId(userid) },
                            { $push: { product: proobj } }
                        );
                        resolve({ status: true, message: "Product added to cart" });
                    }
                } else {
                    let cartobj = { user: ObjectId(userid), product: [proobj] };
                    let result = await db.get().collection(collection.CART_COLLECTION).insertOne(cartobj);
                    resolve({ status: true, message: "New cart created", insertedId: result.insertedId });
                }
            } catch (error) {
                console.error("Error in addtocart:", error);
                reject(error);
            }
        });
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
                                        { $toDouble: '$quantity' },
                                        { $toDouble: '$product.price' }
                                    ]
                                }
                            }
                        }
                    }
                ]).toArray();

                if (total.length > 0 && total[0].total) {
                    resolve(total[0].total);
                } else {
                    resolve(0);
                }
            } catch (err) {
                reject(err);
            }
        });
    },


placeorder: (order, product, total) => {
    console.log(order, product, total);
    return new Promise(async (resolve, reject) => {
        try {
            if (!ObjectId.isValid(order.userid)) {
                return reject(new Error("Invalid User ID format"));
            }

            let status = order['payment-method'] === 'COD' ? 'Order placed' : 'pending';
            let currentDate = new Date();
            let orderMonth = currentDate.toLocaleString('default', { month: 'long' });

            let orderobj = {
                deliveryDetails: {
                    mobile: order.mobile,
                    address: order.address,
                    pincode: order.pincode
                },
                userid: ObjectId(order.userid),
                paymentmethod: order['payment-method'],
                product: product,  // Changed `product` to `products` to match array structure
                totalamount: total,
                status: status,
                date: currentDate,
                month: orderMonth
            };

            let response = await db.get().collection(collection.ORDER_COLLECTION).insertOne(orderobj);
            console.log("Order placed successfully:", response);

            // Ensure the cart is cleared after the order is placed
            await db.get().collection(collection.CART_COLLECTION).deleteOne({ user: ObjectId(order.userid) });

            resolve(response.insertedId);
        } catch (error) {
            console.error("Error in placeorder:", error);
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

    getSalesData: async (adminId) => {
        try {
            let sales = await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                { $match: { adminId: adminId } },
                { $group: { _id: null, totalSales: { $sum: "$amount" } } }
            ]).toArray();
            return sales;
        } catch (error) {
            console.error("Error fetching sales data: ", error);
            throw error;
        }
    },

    getProductsData: async (adminId) => {
        try {
            let products = await db.get().collection(collection.PRODUCT_COLLECTION).find({ adminId: adminId }).toArray();
            return products;
        } catch (error) {
            console.error("Error fetching product data: ", error);
            throw error;
        }
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
                amount: total * 100, // amount in the smallest currency unit
                currency: "INR",
                receipt: orderId.toHexString()
            }

            instance.orders.create(options, function (err, order) {
                console.log("order", order);
                resolve(order)
            });
        })
    },

    verifyPayment: (paymentData) => {
    return new Promise((resolve, reject) => {
        try {
            // Check if data is nested in "payment" object
            let { razorpay_payment_id, razorpay_order_id, razorpay_signature } = 
                paymentData.razorpay_order_id ? paymentData : paymentData.payment;

            if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
                return reject(new Error("Missing payment verification data"));
            }

            let hmac = crypto.createHmac('sha256', process.env.RAZORPAY_SECRET);
            hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
            let expectedSignature = hmac.digest('hex');

            if (expectedSignature === razorpay_signature) {
                console.log("Payment verification successful");
                resolve({ success: true });
            } else {
                console.error("Payment verification failed. Signature mismatch.");
                reject(new Error("Invalid payment signature"));
            }
        } catch (error) {
            console.error("Error in verifyPayment:", error);
            reject(error);
        }
    });
},

    changepaymentstatus: (orderid) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION)
                .updateOne(
                    { _id: objectid(orderid) },
                    {
                        $set: {
                            status: 'Order placed'
                        }
                    }
                )
                .then((response) => {
                    resolve(response); 
                })
                .catch((err) => {
                    reject(err); 
                });
        });
    },
}
