'use strict';

var fs = require('fs');
var glob = require('glob');
var path = require('path');
var Sequelize = require('sequelize');
var _ = require('lodash');
var config = require('./env/'+NODE_ENV+'.js');
var db = {};
var authenticateService = require('../service/authenticate.service');

var models = module.exports = {
    Sequelize: Sequelize,
    init: init
};


function init(callback) {


    // create your instance of sequelize
    var sequelize = new Sequelize(config.db.name, config.db.username, config.db.password, {
        host: config.db.host,
        port: config.db.port,
        dialect: 'mysql',
        //storage: config.db.storage,
        logging: NODE_ENV=='development'?console.log:false,//config.enableSequelizeLog ? winston.verbose : false,
        timezone: config.db.timezone,
        define: {
            timestamps: true,
            freezeTableName: true,
            underscored: true
        }
    });

//console.log(process.cwd());
    glob("./models/*.js", {}, function (er, files) {
        // files is an array of filenames.
        // If the `nonull` option is set, and nothing
        // was found, then files is ["**/*.js"]
        // er is an error object or null.

        files.forEach(filePath =>{
            let modelPath = path.resolve(filePath);
            //console.log(modelPath) ;
            var model = sequelize.import(modelPath);
            db[model.name] = model;
        });


        Object.keys(db).forEach(function (modelName) {
            if (db[modelName].options.hasOwnProperty('associate')) {
                db[modelName].options.associate(db);
            }
        });




        // db.SmsDiario.sync({force:true});
// Synchronizing any model changes with database.
        // WARNING: this will DROP your database everytime you re-run your application
        sequelize
        //.sync({force: config.forceSequelizeSync})
            .sync()
            .then(function () {
                //winston.info('Database ' + (config.forceSequelizeSync ? '*DROPPED* and ' : '') + 'synchronized');
                models.sequelize = sequelize;
                _.extend(models, db);
                setupAdminUser(callback);
                // callback();
            }).catch(function (err) {

            console.error(err);
            // winston.error('An error occured: %j', err.message || JSON.stringify(err));
        });


    });




    //function create models

    function readdirSync(route) {

        fs.readdirSync(route)
            .filter(function (file) {
                return (file.indexOf('.') !== 0) && (file !== 'index.js');
            })
            // import model files and save model names
            .forEach(function (file) {
               // winston.info('Loading model file ' + file);
                var model = sequelize.import(path.join(route, file));
                db[model.name] = model;
            });
    }

    function setupAdminUser(callback) {
        db.User.findOne({where: {email: 'admin@localhost.com'}}).then(function (user) {
            if (!user) {

                var crypto = require('crypto');

                //req.body is user json model
                let adminUser = {
                    username:'admin',
                    'email':'admin@localhost.com',
                    'password':NODE_ENV==='development'?'admin':'rbr@prod#7',
                    'role':'MASTER',
                    'status':'ENABLED'
                };
                var user = db.User.build(adminUser);

                user.provider = 'local';
                user.salt = crypto.randomBytes(16).toString('base64');

                var salt2 = new Buffer(user.salt, 'base64');
                try{
                    // console.log(crypto.getHashes());
                    user.hashedPassword = crypto.pbkdf2Sync(adminUser.password, salt2, 10000, 64,'sha1').toString('base64');
                }catch(err){
                    console.log(err);
                }
                user.save().then(function(){
                    callback();
                })
            }else{
                callback();
            }
        })
    }
}
