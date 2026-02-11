import { useRef } from 'react';
import { useMap } from '../hooks/useMap';
import { benchmark } from '../performanceTest/benchmark';

export default function Map() {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const map = useMap(mapContainerRef);

    const handleBenchmark = async () => {
        if (!map.current) {
            console.error("Map not initialized");
            return;
        }
        
        console.log("Running benchmark...");
        const results = await benchmark(map.current);
        console.log("Benchmark complete!", results);
    };



    return (
        <div style={{ height: '100%'}}>

        <button 
                onClick={handleBenchmark}
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 1000,
                    padding: '10px 20px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}
            >
                Run Benchmark
        </button>


        <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />

        </div>

    );
    
}