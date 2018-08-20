var db = require('../config/sequelize');

exports.createUser = (newUser)=>{

    var crypto = require('crypto');

    //req.body is user json model
    newUser.status='ENABLED';
    var user = db.User.build(newUser);

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

    /*
    user.save().then(function(user){
        res.json(user);
    }).catch(function(err){
        res.sendStatus(500).send(err);
    });*/
    return user.save();

};