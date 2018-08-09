module.exports = function(sequelize, DataTypes) {

    var User = sequelize.define('User', {
        email: {
            type: DataTypes.STRING,
            unique: true,
            isEmail: true,
            notEmpty: true
        },
        username: {
            type: DataTypes.STRING,
            unique: true,
            notEmpty: true
        },
        language: {
            type: DataTypes.STRING
        },
        timezone: {
            type: DataTypes.STRING
        },
        firstName: {
            type: DataTypes.STRING
        },
        lastName: {
            type: DataTypes.STRING
        },
        hashedPassword: {
            type: DataTypes.STRING
        },
        provider: {
            type: DataTypes.STRING
        },
        salt: {
            type: DataTypes.STRING
        },
        role: {
            type: DataTypes.ENUM('MASTER', 'ADMIN', 'USER')
        },
        status: {
            type: DataTypes.ENUM('ENABLED', 'DISABLED')
        }
    }, {
        instanceMethods: {

        },
        associate: function(models) {





        }
    });

    return User;
};