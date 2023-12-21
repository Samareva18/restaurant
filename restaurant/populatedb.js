#! /usr/bin/env node

// скрипт для стартого заполнения бд ресторана
// 1. создается пользователь administrator с правами админа
// 2.1 создаются 4 столика на 2 места
// 2.2 создаются 4 столика на 4 места
// 2.3 создаются 2 столика на 8 мест
// 3. создаются тестовые пользователи Том и Марк
// 4. создаются тестовые брони столиков от Тома и Марка

var async = require('async')

var Table = require('./models/table')
//var User = require('./models/user')
var TableInstance = require('./models/tableinstance')


var mongoose = require('mongoose');

var mongoDB = "mongodb+srv://AndreevaKate:AndreevaKate@cluster0.bz3pbkr.mongodb.net/?retryWrites=true&w=majority"
mongoose.connect(mongoDB, {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.Promise = global.Promise;
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var tables = []
var tableinstances = []



function tableCreate(name, chairs_count, description, cb) {
    table_detail = {
        tab_name: name, 
        chairs: chairs_count, 
    }
    if (description != false) table_detail.description = description

    var table = new Table(table_detail);

    table.save(function(err) {
        if (err) {
            cb(err, null)
            return
        }
        console.log('Добавлен новый стол: ' + table);
        tables.push(table)
        cb(null, table)
    });
}

//function tableinstanceCreate(table, user_data, reserv_start, reserv_end, reserv_description, updated, cb) {
//
//    var user = new userCreate(user_data);
//
//    tableinstance_detail = {
//        table: table, 
//        user: user, 
//        time_start: reserv_start, 
//        time_end: reserv_end, 
//        updated: updated
//    }
//    if (reserv_description != false) tableinstance_detail.reserv_description = reserv_description
//
//    var tableinstance = new TableInstance(tableinstance_detail);
//
//    tableinstance.save(function(err) {
//        if (err) {
//            console.log('ERROR CREATING Tableinstance: ' + tableinstance)
//            cb(err, null)
//            return
//        }
//        console.log('Новое бронирование: ' + tableinstance);
//        tableinstances.push(tableinstance)
//        cb(null, tableinstance)
//    });
//}

function tableinstanceCreate(table, user, reserv_start, reserv_end, reserv_description, updated, cb, phone_number) {

   // var user = new userCreate(user_data);

    tableinstance_detail = {
        table: table, 
        user: user, 
		phone_number: phone_number,
        time_start: reserv_start, 
        time_end: reserv_end, 
        updated: updated
		
    }
    if (reserv_description != false) tableinstance_detail.reserv_description = reserv_description

    var tableinstance = new TableInstance(tableinstance_detail);

    tableinstance.save(function(err) {
        if (err) {
            console.log('ERROR CREATING Tableinstance: ' + tableinstance)
            cb(err, null)
            return
        }
        console.log('Новое бронирование: ' + tableinstance);
        tableinstances.push(tableinstance)
        cb(null, tableinstance)
    });
}

function createTables(cb) {
    async.series([
        function(callback) {
            tableCreate('стол №14','3', false, callback)
        },
     // function(callback) {
     //     tableCreate('стол №2','2', false, callback)
     // },
     // function(callback) {
     //     tableCreate('стол №3','2', 'стол у входа', callback)
     // },
     // function(callback) {
     //     tableCreate('стол №4','2', 'стол, за который все запинаются', callback)
     // },
     // function(callback) {
     //     tableCreate('стол №5','4', 'стол у окна', callback)
     // },
     // function(callback) {
     //     tableCreate('стол №6','4', 'стол у окна', callback)
     // },
     // function(callback) {
     //     tableCreate('стол №7','4', 'стол у входа', callback)
     // },
     // function(callback) {
     //     tableCreate('стол №8','4', 'ничем не примечательный стол', callback)
     // },
     // function(callback) {
     //     tableCreate('стол №9','8', 'стол в углу', callback)
     // },
     // function(callback) {
     //     tableCreate('стол №10','8', 'стол у окна', callback)
     // },
     // function(callback) {
     //     tableCreate('стол №11','1', 'стол для forever alone', callback)
        // },
    ], cb);
}

function createTableInstances(cb) {
    async.parallel([
        function(callback) {
           // var user = {
           //     login: 'Tom', 
           //     isAdmin: false, 
           //     first_name: 'Томас', 
           //     last_name: 'Тостов', 
           //     birth_day: false,
           //     phone_number: '+7355',
           //     cb: callback
           // }
		    var user = 'Катя'
            var start_date = '2022-1-7' //new Date('2022-1-7T10:30:00')
            var end_date = '2022-1-8' //new Date('2022-1-7T12:30:00')
            var updated = '2022-1-7'
			var phone_number = '89123456789'
            tableinstanceCreate(tables[0], user, start_date, end_date, false, updated, callback, phone_number)
        },
        // function(callback) {
        //     var user = {
        //         login: 'Mark', 
        //         isAdmin: false, 
        //         first_name: 'Марк', 
        //         last_name: 'Марков', 
        //         birth_day: '1996-01-02',
        //         phone_number: '+7944',
        //         cb: callback
        //     }
        //     var start_date = '2022-1-8' 
        //     var end_date = '2022-1-9' 
        //     var updated = '2022-1-8'
        //     tableinstanceCreate(tables[6], user, start_date, end_date, false, updated, callback)
        // },
        // function(callback) {
        //     var user = ['Mark', false, 'Марк', 'Марков', '1996-01-02']
        //     tableinstanceCreate(tables[6], user, '2022-01-08T12:00:00.000+00.00', '2022-01-08T15:00:00.000+00.00', false, Date.now, callback)
        // },
        // function(callback) {
        //     var user = ['Mark', false, 'Марк', 'Марков', false]
        //     tableinstanceCreate(tables[9], users[2], '2022-01-09T17:00:00.000+00.00', '2022-01-09T21:00:00.000+00.00', false, Date.now, callback)
        // },
        // function(callback) {
        //     var user = ['Mark', false, 'Марк', 'Марков', false]
        //     tableinstanceCreate(tables[10], users[2], '2022-01-07T17:00:00.000+00.00', '2022-01-07T19:00:00.000+00.00', false, Date.now, callback)
        // },
    ], cb);
}


async.waterfall([
    createTables,
    createTableInstances
],

function(err, results) {
    if (err) {
        console.log('FINAL ERR: ' + err);
    }
    else {
        // console.log('Состояние столиков: ' + tableinstances);
        
    }
    // All done, disconnect from database
    mongoose.connection.close();
});