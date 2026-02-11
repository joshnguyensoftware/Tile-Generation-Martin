import maplibregl from 'maplibre-gl';

function flyToAsync(map: maplibregl.Map, options: maplibregl.FlyToOptions): Promise<void> {
    return new Promise((resolve) => {
        map.once('moveend', resolve); // register the listener
        map.flyTo(options);
    });
}

function waitForIdleWithTimer(map: maplibregl.Map): Promise<number> {
    return new Promise((resolve) => {
        const startTime = performance.now();

        if (map.loaded() && !map.isMoving() && !map.isZooming() && !map.isRotating()) {
            resolve(0);
            return;
        }
        
        map.once('idle', () => {
            const endTime = performance.now();
            const idleTime = endTime - startTime;
            resolve(idleTime);
        });
    });
}

export interface BenchmarkResult {
    fps: number;
    averageTimeToIdle: number;
    maxTimeToIdle: number;
    mainThreadBlocking: number;
    averageJSHeap: number;
    maxJSHeap: number;
}

export async function benchmark(mapRef: maplibregl.Map): Promise<BenchmarkResult> {
    
    console.log("Starting benchmark...");
    
    const startTime = performance.now();
    let frameCount = 0;
    let longTaskCount = 0;
    let running = true;
    let jsHeapSizes : number [] = [];
    let jsHeapSizePerIteration : number[] = [];
    let idleTimes : number[] = [];
    let maxIdleTime = 0;
    let maxHeap = 0;



    // FPS Measurement
    const loop = () => {
        if (!running) return;
        frameCount++;
     

        if ((performance as any).memory) {
            let currentHeap = (performance as any).memory.usedJSHeapSize / (1024 * 1024)
            jsHeapSizePerIteration.push(currentHeap);
            maxHeap = Math.max(maxHeap, currentHeap);
        } else {
            console.warn("performance.memory not available (Chrome-only API)");
        }

        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    // Long Task Measurement
    let observer: PerformanceObserver | null = null;

    for(let i = 0; i < 5; i++){ 
        jsHeapSizePerIteration = [];
        

        observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                if (entry.duration > 50) { // Long task threshold
                    longTaskCount++;
                }
            }); 
        });

        observer.observe({ entryTypes: ['longtask'] });

        const locations = [
            { center: [174.7633, -36.8485] as [number, number], zoom: 13, duration: 4000, name: 'Auckland' },
            { center: [174.7762, -41.2865] as [number, number], zoom: 12, duration: 4000, name: 'Wellington' },
            { center: [172.6306, -43.5321] as [number, number], zoom: 12, duration: 4000, name: 'Christchurch' },
            { center: [168.6616, -45.0312] as [number, number], zoom: 11, duration: 4000, name: 'Queenstown' },
            { center: [176.8858, -39.4928] as [number, number], zoom: 12, duration: 4000, name: 'Napier' },
            { center: [170.5036, -45.8742] as [number, number], zoom: 11, duration: 4000, name: 'Dunedin' },
            { center: [173.2839, -41.2706] as [number, number], zoom: 12, duration: 4000, name: 'Nelson' },
            { center: [175.2793, -37.7870] as [number, number], zoom: 13, duration: 4000, name: 'Hamilton' },
            { center: [174.7633, -36.8485] as [number, number], zoom: 8, duration: 3000, name: 'Auckland zoomed out' },
            { center: [174.7633, -36.8485] as [number, number], zoom: 15, duration: 3000, name: 'Auckland zoomed in' },
            { center: [174.7762, -41.2865] as [number, number], zoom: 10, duration: 3000, name: 'Wellington zoomed out' },
            { center: [172.6306, -43.5321] as [number, number], zoom: 15, duration: 3000, name: 'Christchurch zoomed in' },
            { center: [174.7633, -36.8485] as [number, number], zoom: 10, duration: 6000, name: 'Return to Auckland, slow pan' },
        ];

        for (const location of locations) {
            await flyToAsync(mapRef, {
                center: location.center,
                zoom: location.zoom,
                duration: location.duration,
                essential: true
            });

            const idleTime = await waitForIdleWithTimer(mapRef);
            maxIdleTime = Math.max(maxIdleTime, idleTime);
            idleTimes.push(idleTime);
            
            console.log(`${location.name}: Time-to-Idle = ${idleTime.toFixed(2)}ms`);
        }

        jsHeapSizes.push(jsHeapSizePerIteration.reduce((a, b) => a + b, 0) / jsHeapSizePerIteration.length);
        observer.disconnect();
    }

    running = false;
  
    const totalTime = (performance.now() - startTime) / 1000;
    const averageFps = frameCount / totalTime;
    const averageIdleTime = idleTimes.reduce((a, b) => a + b, 0) / idleTimes.length;
    const averageJsHeap = jsHeapSizes.reduce((a, b) => a + b, 0) / jsHeapSizes.length;

    const result: BenchmarkResult = {
        fps: averageFps,
        averageTimeToIdle: averageIdleTime,
        maxTimeToIdle: maxIdleTime,
        mainThreadBlocking: longTaskCount,
        averageJSHeap: averageJsHeap,
        maxJSHeap: maxHeap
    };

    console.log("\n=== Benchmark Results ===");
    console.log(`Average FPS: ${result.fps}`);
    console.log(`Average Time-to-Idle: ${result.averageTimeToIdle}ms`);
    console.log(`Max Time-to-Idle: ${result.maxTimeToIdle}ms`);
    console.log(`Long Tasks (>50ms): ${result.mainThreadBlocking}`);
    console.log(`Average JS Heap Size: ${result.averageJSHeap} MB`);
    console.log(`Max JS Heap Size: ${result.maxJSHeap} MB`);

    return result;
}


