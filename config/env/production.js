var url = 'http://191.252.101.89:3001';
module.exports = {
    // This is your MYSQL Database configuration
    db: {
        name: 'lm_belem',
        password: 'MyNewPass',
        username: 'root',
        host:'localhost',
        port:3306,
        timezone: '-03:00'
    },
    jwtSecret:'fi413',
    jwtSession:{session: false},
    app: {
        name: 'Tiny backend - Production',
        port:3001
    },
    url:url
};
