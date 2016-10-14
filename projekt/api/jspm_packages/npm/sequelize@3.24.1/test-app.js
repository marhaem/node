/* */ 
"use strict";
/* jshint esnext:true, -W110 */

var Sequelize, sequelize, DataTypes, Promise = require('bluebird'), _ = require('lodash'), moment = require('moment');

Sequelize = DataTypes = require('./index.js');
// var db = sequelize = new Sequelize('sequelize', 'root', '', {
var db = sequelize = new Sequelize('sequelize_test', 'postgres', 'postgres', {
  dialect: 'postgres',
//var db = sequelize = new Sequelize('sequelize-test-72', 'sequelize', 'nEGkLma26gXVHFUAHJxcmsrK', {
  //dialect: 'mssql',
  //host: 'mssql.sequelizejs.com',
  //port: 11433,
  //dialect: 'sqlite',
  //storage: '/tmp/test.sqlite',
//  timezone: '+05:30',
  define: {
    // timestamps: false,
  },
  logging: console.log
});

const User = sequelize.define('user', {
  id: {
    type: Sequelize.UUID,
    field: 'id',
    allowNull: false,
    unique: true,
    primaryKey: true
  },
  createdAt: {
    type: Sequelize.DATE,
    field: 'createdAt'
  },
  updatedAt: {
    type: Sequelize.DATE,
    field: 'updatedAt'
  },
  fullName: {
    type: Sequelize.STRING,
    field: 'fullName',
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [0, 255]
    }
  },
  firstName: {
    type: Sequelize.STRING,
    field: 'firstName',
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [0, 255]
    }
  },
  lastName: {
    type: Sequelize.STRING,
    field: 'lastName',
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [0, 255]
    }
  },
  phone: {
    type: Sequelize.STRING,
    field: 'phone',
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [0, 255]
    }
  }
});

var UserRole = sequelize.define('user_role', {
  id: {
    type: Sequelize.UUID,
    field: 'id',
    allowNull: false,
    unique: true,
    primaryKey: true
  },
  createdAt: {
    type: Sequelize.DATE,
    field: 'createdAt'
  },
  updatedAt: {
    type: Sequelize.DATE,
    field: 'updatedAt'
  },
  name: {
    type: Sequelize.STRING,
    field: 'name',
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [0, 255]
    }
  }
});

var UserRoleAssociation = sequelize.define('userRoleAssociation', {
  id: {
    type: Sequelize.UUID,
    field: 'id',
    allowNull: false,
    unique: true,
    primaryKey: true
  },
  createdAt: {
    type: Sequelize.DATE,
    field: 'createdAt'
  },
  updatedAt: {
    type: Sequelize.DATE,
    field: 'updatedAt'
  },
  userInfoId: {
    type: Sequelize.UUID,
    allowNull: false,
    field: 'userInfoId'
  },
  userRoleId: {
    type: Sequelize.UUID,
    allowNull: false,
    field: 'userRoleId'
  }
});

UserRole.belongsToMany(User, {
  as: 'Users',
  through: UserRoleAssociation.tableName,
  foreignKey: {
    name: 'userRoleId'
  }
});
User.belongsToMany(UserRole, {
  as: 'Roles',
  through: UserRoleAssociation.tableName,
  foreignKey: {
    name: 'userInfoId'
  }
});

return sequelize.sync({
  force: true,
  logging: console.log
})
  .then(() => {
    return User.findOne({
      where: { id: 42 },
      include: {
        as: 'Roles',
        attributes: ['id'],
        model: UserRole
      }
    });
  })
  .finally(() => sequelize.close());