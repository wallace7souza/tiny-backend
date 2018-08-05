var url = 'http://localhost:3000';
module.exports = {
    // This is your MYSQL Database configuration
    db: {
        name: 'tinybackend',
        username: 'root',
        password: 'root',
        host:'localhost',
        timezone: '-03:00'
    },
    jwtSecret:'myDevEnv',
    jwtSession:{session: false},
    app: {
        port:3000,
        name: 'Tiny backend - Development'
    },
    url:url,

};
