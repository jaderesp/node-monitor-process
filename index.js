import _ from 'lodash'
import { createServer } from 'node:http'
import { Session } from 'node:inspector/promises';
import { writeFile } from 'node:fs/promises';

function cpuProfiling() {
    let _session;
    return {
        async start() {
            _session = new Session();
            await _session.connect();
            await _session.post('Profiler.enable');
            await _session.post('Profiler.start');
            console.log('CPU profiling started');
        },
        async stop() {
            console.log('CPU profiling stopped');
            let profile;

            try {
                await _session.post('Profiler.stop').then(async (data) => {
                    profile = data?.profile;
                    console.log(profile)
                    if (profile) {
                        await writeFile(`./cpu_profile_${Date.now()}.cpuprofile`, JSON.stringify(profile));
                    }
                    await _session.disconnect();
                });

            } catch (error) {
                console.log("Erro ao parar o Profiler:  ", error)
                // await _session.disconnect();
            }

        }
    }
}


const largeDataset = Array.from({ length: 1e4 }, (_, id) => ({
    id,
    name: `User ${id}`,
    isActive: id % 2 === 0,
}));

function issueRoute() {
    const clonedData = _.cloneDeep(largeDataset);

    const activeUsers = _.filter(clonedData, { isActive: true });

    const transformedUsers = _.map(activeUsers, (user) => ({
        ...user,
        name: user.name.toUpperCase(),
    }));
    return transformedUsers;
}

function noIssueRoute() {
    const transformedUsers = largeDataset
        .filter((user) => user.isActive)
        .map((user) => ({
            ...user,
            name: user.name.toUpperCase(),
        }));
    return transformedUsers;
}

createServer(
    function routes(req, res) {
        if (req.url === '/issue') {
            const transformedUsers = issueRoute();
            res.end(JSON.stringify(transformedUsers));
            return
        }


        if (req.url === '/no-issue') {
            const transformedUsers = noIssueRoute();
            res.end(JSON.stringify(transformedUsers));
            return
        }
        res.writeHead(404);
        res.end('Not Found');
        return
    })
    .listen(3000)
    .once('listening', function onListening() {
        console.log('Server started on http://localhost:3000');
    });


const { start, stop } = cpuProfiling();

start();

const exitSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];

exitSignals.forEach(function (signal) {
    process.on(signal, async function () {
        console.log(`Received ${signal}, stopping server...`);
        await stop();
        process.exit(0);
    });
});

