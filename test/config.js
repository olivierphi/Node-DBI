// @see /.travis.yml

module.exports = {

    mysql: {
        host:     '127.0.0.1',
        user:     'root',
        password: '',
        database: 'node_dbi_test'
    },

    pgsql: {
        host:     '127.0.0.1',
        user:     'postgres',
        password: '',
        database: 'node_dbi_test'
    },

    sqlite: {
        database: ':memory:'
    }

};
