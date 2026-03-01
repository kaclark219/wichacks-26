#include <iostream>
#include <string>
#include <smartspectra/container/foreground_container.hpp>
#include <smartspectra/media/opencv/imread.hpp>
#include <opencv2/opencv.hpp>
#include <hiredis/hiredis.h>
#include <sstream>
#include <iomanip>
#include <ctime>
#include <chrono>
#include <cstdlib>

std::string getCurrentTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto time_t_now = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&time_t_now), "%Y-%m-%dT%H:%M:%S");
    return ss.str();
}

void publishToRedis(redisContext* redis, const std::string& channel, const std::string& message) {
    if (!redis || redis->err) {
        std::cerr << "Redis error: " << redis->errstr << "\n";
        return;
    }
    redisReply* reply = (redisReply*)redisCommand(redis, "PUBLISH %s %s", 
                                                    channel.c_str(), message.c_str());
    if (reply) freeReplyObject(reply);
}

int main(int argc, char** argv) {
    std::cout << "\n========================================\n";
    std::cout << "Presage SmartSpectra Physiology Server\n";
    std::cout << "========================================\n\n";

    const char* api_key = std::getenv("SMARTSPECTRA_API_KEY");
    if (!api_key) {
        std::cerr << "Error: SMARTSPECTRA_API_KEY not set\n";
        return 1;
    }

    try {
        std::cout << "Connecting to Redis...\n";
        std::string redis_host = std::getenv("REDIS_HOST") ? std::getenv("REDIS_HOST") : "localhost";
        int redis_port = std::getenv("REDIS_PORT") ? std::stoi(std::getenv("REDIS_PORT")) : 6379;
        
        redisContext* redis = redisConnect(redis_host.c_str(), redis_port);
        if (redis == NULL || redis->err) {
            std::cerr << "Redis connection failed\n";
            if (redis) redisFree(redis);
            return 1;
        }
        std::cout << "Redis connected at " << redis_host << ":" << redis_port << "\n\n";

        std::string metrics_channel = "presage:metrics";
        
        std::cout << "Creating SmartSpectra container...\n";
        auto container = presage::physiology::CpuContinuousRestForegroundContainer::Create(
            presage::imaging::opencvimread::OpenCVFrameProvider::Create(0),
            std::string(api_key)
        );

        if (!container.ok()) {
            std::cerr << "Failed to create container: " << container.status().message() << "\n";
            redisFree(redis);
            return 1;
        }

        auto hud = presage::physiology::CpuContinuousRestForegroundContainer::Hud::Create();
        if (!hud.ok()) {
            std::cerr << "Failed to create HUD\n";
            redisFree(redis);
            return 1;
        }
        std::cout << "SmartSpectra initialized\n\n";

        // Metrics callback
        auto status = (*container)->SetOnCoreMetricsOutput(
            [redis, metrics_channel](const presage::physiology::CoreMetrics& metrics) mutable {
                std::stringstream json;
                json << "{\"timestamp\":\"" << getCurrentTimestamp() << "\",\"metrics\":{";
                
                if (metrics.pulse.has_value()) {
                    json << "\"pulse\":" << metrics.pulse->value << ",";
                    json << "\"pulse_confidence\":" << metrics.pulse->confidence;
                }
                
                if (metrics.breathing.has_value() && !metrics.breathing->upper_trace.empty()) {
                    if (metrics.pulse.has_value()) json << ",";
                    json << "\"breathing\":" << metrics.breathing->upper_trace[0].rate;
                }
                
                json << "}}";
                publishToRedis(redis, metrics_channel, json.str());
                
                if (metrics.pulse.has_value()) {
                    std::cout << "Pulse: " << metrics.pulse->value << " BPM " << "(confidence: " << metrics.pulse->confidence << ")\n";
                }
                
                return absl::OkStatus();
            }
        );

        if (!status.ok()) {
            std::cerr << "Failed to set metrics callback\n";
            redisFree(redis);
            return 1;
        }

        // Video callback
        status = (*container)->SetOnVideoOutput(
            [hud](cv::Mat& frame, int64_t timestamp) mutable {
                (*hud)->Render(frame);
                cv::imshow("Presage SmartSpectra", frame);
                cv::waitKey(1);
                return absl::OkStatus();
            }
        );

        if (!status.ok()) {
            std::cerr << "Failed to set video callback\n";
            redisFree(redis);
            return 1;
        }

        // Initialize
        if (auto init_status = (*container)->Initialize(); !init_status.ok()) {
            std::cerr << "Failed to initialize container\n";
            redisFree(redis);
            return 1;
        }

        std::cout << "========================================\n";
        std::cout << "SmartSpectra Running\n";
        std::cout << "========================================\n";
        std::cout << "Press 's' to start/stop recording\n";
        std::cout << "Publishing to: " << metrics_channel << "\n\n";

        // Main loop
        while (true) {
            if (auto proc_status = (*container)->Process(); !proc_status.ok()) {
                break;
            }
        }

        std::cout << "\nShutting down...\n";
        redisFree(redis);
        cv::destroyAllWindows();

    } catch (const std::exception& e) {
        std::cerr << "Exception: " << e.what() << "\n";
        return 1;
    }

    return 0;
}
