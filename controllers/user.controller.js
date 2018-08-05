var db = require('../config/sequelize');
exports.prefix = 'User';

/**
 * @GET
 * @path /all
 * @role ADMIN
 */
exports.all = function(req,res,next){

    var options ={order:[['firstName','ASC']]};
    if(req.query.role){
        options.where={
            role:req.query.role
        }
    }

    if (req.query.search) {

        var isnum = /^\d+$/.test(req.query.search);
        if (isnum) {
            options.where.cpf = {
                $like: '%' + req.query.search + '%'
            }
        } else {
            options.where.$or= {
                firstName:{
                    $like: '%' + req.query.search + '%'
                },
                lastName:{
                    $like: '%' + req.query.search + '%'
                }

            }
        }

        // options.limit = 100;
    }


    db.User.findAll(options).then(function (result) {
        result.forEach(user=>{
            delete user.dataValues.salt;
            delete user.dataValues.hashedPassword;
        })
        res.body = result;
        res.json(result)
    }, function (err) {
        res.status(500).send({
            error: ''
        });
    });
}


/**
 * @PUT
 * @path /update
 */
exports.update = (req,res,next)=>{

    db.User.update(req.body,{where:{id:req.body.id}}).then(function(){
        res.sendStatus(200);
    }).catch(function(err){
        res.sendStatus(500).send(err);
    });


};

/**
 * @POST
 * @path  /create
 */
exports.create = function (req,res,next){

    var crypto = require('crypto');

    //req.body is user json model
    req.body.status='ENABLED';
    var user = db.User.build(req.body);

    user.provider = 'local';
    user.salt = crypto.randomBytes(16).toString('base64');

    var salt2 = new Buffer(user.salt, 'base64');
    try{
       // console.log(crypto.getHashes());
        user.hashedPassword = crypto.pbkdf2Sync(req.body.password, salt2, 10000, 64,'sha1').toString('base64');
    }catch(err){
        console.log(err);
    }


    console.log('New User (local) : { id: ' + user.id + ' username: ' + user.username + ' }');

    user.save().then(function(user){
        res.json(user);
    }).catch(function(err){
        res.sendStatus(500).send(err);
    });

}