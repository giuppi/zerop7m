use std::env;
use std::fs;
use std::path::Path;
use std::time::Instant;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        eprintln!("Usage: benchmark_native <path_to_p7m>");
        std::process::exit(1);
    }

    let file_path = Path::new(&args[1]);
    let file_name = file_path.file_name().unwrap().to_str().unwrap();
    let bytes = fs::read(file_path).expect("Failed to read input .p7m file");

    let file_size_mb = bytes.len() as f64 / (1024.0 * 1024.0);
    println!("Native: loaded {file_name} ({file_size_mb:.2} MB)");

    // Benchmark inspect_p7m
    let t0 = Instant::now();
    let result = p7m_core::inspect_p7m(file_name, &bytes);
    let elapsed = t0.elapsed();
    let elapsed_ms = elapsed.as_secs_f64() * 1000.0;

    match result {
        Ok(output) => {
            let payload_mb = output.payload.len() as f64 / (1024.0 * 1024.0);
            println!("NATIVE_UNWRAP_TIME_MS: {elapsed_ms:.2}");
            println!(
                "Native: unwrap successful. Extracted: {} ({payload_mb:.2} MB), Layers: {}, Mime: {}",
                output.report.extracted_file_name,
                output.report.layers.len(),
                output.report.mime_type
            );
        }
        Err(err) => {
            eprintln!("Native inspect failed: {err:?}");
            std::process::exit(1);
        }
    }
}
