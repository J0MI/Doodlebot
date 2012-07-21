process.on('uncaughtException', function(err){
    process.send({
        'type': 'exception',
        'ex': err
    });
});

function runModule(rundata){
    var module = process.argv[2];
    var modulePath = process.argv[3];
    var args = process.argv.slice(4);

     fs.readFile(modulePath, 'utf8', function(err, data){
         if ( err ){
            process.send({
                'type': 'exception',
                'ex': err
            });
            return;
        }

        vm.runInNewContext(data, rundata, modulePath);
    });
}

process.on('message', function(obj){
    if ( obj && obj.rundata )
        runModule(rundata);
});

