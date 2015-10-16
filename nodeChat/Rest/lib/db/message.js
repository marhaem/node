import Sequelize from 'sequelize';

export let messageTable = {
  index: function (sequelize) {
    var Messages = sequelize.define('Messages', {
      message: {
        type: Sequelize.STRING
      },
      from: {
        type: Sequelize.INTEGER
      }
    }, {
      freezeTableName: true,
      charset: 'utf8',
      collate: 'utf8_general_ci',
      createdAt: 'timestamp',
      updatedAt: false
    });

    return Messages;
  }
};
