/* */ 
"use strict";
/* jshint esnext:true, -W110 */

var Sequelize, sequelize, DataTypes, Promise = require('bluebird'), _ = require('lodash'), moment = require('moment');

Sequelize = DataTypes = require('./index.js');
// var db = sequelize = new Sequelize('sequelize', 'root', '', {
var db = sequelize = new Sequelize('sequelize_test', 'postgres', 'postgres', {
  // dialect: 'postgres',
//var db = sequelize = new Sequelize('sequelize-test-72', 'sequelize', 'nEGkLma26gXVHFUAHJxcmsrK', {
  //dialect: 'mssql',
  //host: 'mssql.sequelizejs.com',
  //port: 11433,
  dialect: 'sqlite',
  //storage: '/tmp/test.sqlite',
//  timezone: '+05:30',
  define: {
    // timestamps: false,
  },
  logging: console.log,
  // pool: {
  //   max: 10,
  //   min: 2,
  //   idle: 10000
  // }
});



var Events = sequelize.define("Events", {        //Must be same as table name
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true // Automatically gets converted to SERIAL for postgres
  },
  Name: {
    type: DataTypes.STRING,
    notNull: true
  },
  Description: {
    type: DataTypes.STRING,
    notNull: true
  },
  Venue: {
    type: DataTypes.STRING,
    notNull: true
  },
  StartTime: {
    type: DataTypes.STRING,
    notNull: true
  },
  EndTime: {
    type: DataTypes.STRING,
    notNull: true
  },
  StartDate: {
    type: DataTypes.STRING,
    notNull: true
  },
  EndDate: {
    type: DataTypes.STRING,
    notNull: true
  },
  CurrentRound: {
    type: DataTypes.STRING,
    notNull: true
  },
  Society: {
    type: DataTypes.STRING,
    notNull: true
  },
  CategoryId: {
    type: DataTypes.INTEGER,
    notNull: true
  },
  MaxContestants: {
    type: DataTypes.INTEGER,
    notNull: true
  },
  Status: {
    type: DataTypes.STRING,
    notNull: true
  },
  Pdf: {
    type: DataTypes.STRING,
    notNull: true
  }
}, {
  timestamps: false,
  tableName: 'Events',
  freezeTableName: true
}, {
  indexes: [
    { type: 'FULLTEXT', fields: 'name' }
  ]
},{
  classMethods: {
    associate: function(models) {
      Events.belongsTo(models.Category);
    }
  }
});
var Category = sequelize.define("Category", {
  Id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true // Automatically gets converted to SERIAL for postgres
  },
  Name: DataTypes.STRING
}, {
  timestamps: false,
  tableName: 'Category',
  freezeTableName: true
},{
  Indexes: [
    { type: 'FULLTEXT', fields: ['Name'] }
  ]
});

Category.hasMany(models.Events);


sequelize.sync({})

return sequelize.sync({
  force: true,
  logging: console.log
})
  .then(() => {
    return Table.create({
      value: 11
    });
  })
  .then(() => {
    return Table.findAll().then(results => {
      console.log(results[0].value, typeof results[0].value);
    });
  })
  .then(console.log)
  .finally(() => sequelize.close());
