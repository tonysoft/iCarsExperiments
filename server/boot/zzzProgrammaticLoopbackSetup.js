module.exports = function programmaticLoopbackSetup(app, next) {
    console.log('programmaticLoopbackSetup');
    var Car = app.models.Car;
    var Role = app.models.Role;
    var Customer = app.models.Customer;
    var Reservation = app.models.Reservation;
     
    // This Block Below Creates a Many to Many Car / Customer Relationship through Reservation 

        // Reservation.belongsTo(Car);
        // Reservation.belongsTo(Customer);
        // Customer.hasMany(Car, {through: Reservation});
        // Car.hasMany(Customer, {through: Reservation});

    // This Block Below Creates a Many to Many Car / Customer Relationship directly 

        Customer.hasAndBelongsToMany(Car);
        Car.hasAndBelongsToMany(Customer);

//    console.log(Object.keys(Role.prototype));

    Role.registerResolver('$testRole', function(role, ctx, next) {
        next(null, true);
    });

//    next();  // Callback to finish App Init...
};
