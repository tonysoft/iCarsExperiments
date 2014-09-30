var ModelBuilder = require('loopback-datasource-juggler').ModelBuilder;
var modelBuilder = new ModelBuilder();
module.exports = function(Reservation) {

  var TimeStamp = modelBuilder.define('TimeStamp', 
                    {created: Date, modified: Date});

  Reservation.setup = function() {
    console.log('Reservation Mixin TimeStamp');
    Reservation.mixin(TimeStamp);
  };

  Reservation.setup();


};
