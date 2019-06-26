const { Module } = require('module');
const { performance, PerformanceObserver } = require('perf_hooks');

Module.prototype.require = performance.timerify(Module.prototype.require);

// Test module load performance
const observer = new PerformanceObserver((list) => {
  const loadTimes = [];
  list.getEntries().forEach((entry) => {
    if (!entry[0].includes('../src/webserver')) {
      loadTimes.push({ name: entry[0], duration: entry.duration });
    }
  });

  console.log('\nSlowest external module loads (top 15):');
  loadTimes.filter(({ name }) => !name.startsWith('./'))
    .sort((first, second) => second.duration - first.duration)
    .slice(0, 15)
    .forEach(({ name, duration }) => console.log(`  ${name} - ${duration}`));

  observer.disconnect();
});

observer.observe({ entryTypes: ['function'], buffered: true });

const { createWebserverAsync } = require('../src/webserver');

createWebserverAsync('localhost:27017');
