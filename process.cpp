#include <iostream>
#include <fstream>
#include <vector>
#include <cmath>
#include <random>
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "Ws2_32.lib")

// Function to write a signal to a binary file
void write_to_binary_file(const std::string& filename, const std::vector<double>& signal) {
    std::ofstream file(filename, std::ios::binary);
    if (!file) {
        std::cerr << "Error: Unable to open file: " << filename << "\n";
        return;
    }
    for (const auto& sample : signal) {
        file.write(reinterpret_cast<const char*>(&sample), sizeof(sample));
    }
    file.close();
}

// Function to read a signal from a binary file
std::vector<double> read_from_binary_file(const std::string& filename) {
    std::vector<double> signal;
    std::ifstream file(filename, std::ios::binary);
    if (!file) {
        std::cerr << "Error: Unable to open file: " << filename << "\n";
        return signal;
    }
    double sample;
    while (file.read(reinterpret_cast<char*>(&sample), sizeof(sample))) {
        signal.push_back(sample);
    }
    file.close();
    return signal;
}

// Function to receive binary packets from the drone
std::vector<int> receive_packet_from_drone(const std::string& host, int port) {
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);

    SOCKET server_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket == INVALID_SOCKET) {
        std::cerr << "Socket creation failed: " << WSAGetLastError() << "\n";
        WSACleanup();
        return {};
    }

    sockaddr_in address;
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(port);

    if (bind(server_socket, (sockaddr*)&address, sizeof(address)) == SOCKET_ERROR) {
        std::cerr << "Bind failed: " << WSAGetLastError() << "\n";
        closesocket(server_socket);
        WSACleanup();
        return {};
    }

    if (listen(server_socket, 1) == SOCKET_ERROR) {
        std::cerr << "Listen failed: " << WSAGetLastError() << "\n";
        closesocket(server_socket);
        WSACleanup();
        return {};
    }

    std::cout << "Listening for drone packets on port " << port << "...\n";

    SOCKET client_socket = accept(server_socket, nullptr, nullptr);
    if (client_socket == INVALID_SOCKET) {
        std::cerr << "Accept failed: " << WSAGetLastError() << "\n";
        closesocket(server_socket);
        WSACleanup();
        return {};
    }

    std::vector<int> data_bits;
    char buffer[1024];
    int bytes_received = recv(client_socket, buffer, sizeof(buffer), 0);
    while (bytes_received > 0) {
        for (int i = 0; i < bytes_received; ++i) {
            std::cout << buffer[i];
            data_bits.push_back(buffer[i] - '0'); // Convert ASCII to binary
        }
        bytes_received = recv(client_socket, buffer, sizeof(buffer), 0);
    }

    closesocket(client_socket);
    closesocket(server_socket);
    WSACleanup();

    return data_bits;
}

// Function to modulate binary data using QPSK
std::vector<double> qpsk_modulation(const std::vector<int>& data_bits, double carrier_frequency, double sampling_rate, double duration) {
    std::vector<double> modulated_signal;
    size_t samples_per_symbol = static_cast<size_t>(sampling_rate * duration);
    double angular_frequency = 2 * M_PI * carrier_frequency;

    for (size_t i = 0; i < data_bits.size(); i += 2) {
        int bit1 = data_bits[i];
        int bit2 = data_bits[i + 1];
        double phase = 0.0;

        if (bit1 == 0 && bit2 == 0) phase = M_PI / 4;        // 45°
        else if (bit1 == 0 && bit2 == 1) phase = 3 * M_PI / 4; // 135°
        else if (bit1 == 1 && bit2 == 0) phase = 5 * M_PI / 4; // 225°
        else if (bit1 == 1 && bit2 == 1) phase = 7 * M_PI / 4; // 315°

        for (size_t j = 0; j < samples_per_symbol; ++j) {
            double t = j / sampling_rate;
            double carrier_cos = cos(angular_frequency * t);
            double carrier_sin = sin(angular_frequency * t);
            double sample = cos(phase) * carrier_cos + sin(phase) * carrier_sin;
            modulated_signal.push_back(sample);
        }
    }

    return modulated_signal;
}

// Function to add Gaussian noise
std::vector<double> add_gaussian_noise(const std::vector<double>& signal, double mean, double stddev) {
    std::vector<double> noisy_signal(signal.size());
    std::default_random_engine generator;
    std::normal_distribution<double> distribution(mean, stddev);

    for (size_t i = 0; i < signal.size(); ++i) {
        noisy_signal[i] = signal[i] + distribution(generator);
    }

    return noisy_signal;
}

// Function to demodulate QPSK samples into binary data
std::vector<int> demodulate_qpsk(const std::vector<double>& noisy_samples, double carrier_frequency, double sampling_rate, double duration) {
    std::vector<int> data_bits;
    size_t samples_per_symbol = static_cast<size_t>(sampling_rate * duration);
    double angular_frequency = 2 * M_PI * carrier_frequency;

    for (size_t i = 0; i < noisy_samples.size(); i += samples_per_symbol) {
        double in_phase = 0.0;
        double quadrature = 0.0;

        for (size_t j = 0; j < samples_per_symbol; ++j) {
            double t = j / sampling_rate;
            double carrier_cos = cos(angular_frequency * t);
            double carrier_sin = sin(angular_frequency * t);
            in_phase += noisy_samples[i + j] * carrier_cos;
            quadrature += noisy_samples[i + j] * carrier_sin;
        }

        if (in_phase > 0 && quadrature > 0) {
            data_bits.push_back(0);
            data_bits.push_back(0);
        } else if (in_phase < 0 && quadrature > 0) {
            data_bits.push_back(0);
            data_bits.push_back(1);
        } else if (in_phase < 0 && quadrature < 0) {
            data_bits.push_back(1);
            data_bits.push_back(1);
        } else {
            data_bits.push_back(1);
            data_bits.push_back(0);
        }
    }

    return data_bits;
}

std::vector<float> reconstruct_telemetry(const std::vector<int>& data_bits) {
    std::vector<float> telemetry;
    for (size_t i = 0; i < data_bits.size(); i += 8) {
        int value = 0;
        for (int j = 0; j < 8; ++j) {
            value = (value << 1) | data_bits[i + j];
        }
        telemetry.push_back(static_cast<float>(value) / 10.0);
    }
    return telemetry;
}

// Function to send telemetry to Command and Control
void send_telemetry(const std::vector<float>& telemetry, const std::string& host, int port) {
    WSADATA wsaData;
    WSAStartup(MAKEWORD(2, 2), &wsaData);

    SOCKET client_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (client_socket == INVALID_SOCKET) {
        std::cerr << "Socket creation failed: " << WSAGetLastError() << "\n";
        WSACleanup();
        return;
    }

    sockaddr_in server_address;
    server_address.sin_family = AF_INET;
    server_address.sin_port = htons(port);
    inet_pton(AF_INET, host.c_str(), &server_address.sin_addr);

    if (connect(client_socket, (sockaddr*)&server_address, sizeof(server_address)) == SOCKET_ERROR) {
        std::cerr << "Connection to C&C server failed: " << WSAGetLastError() << "\n";
        closesocket(client_socket);
        WSACleanup();
        return;
    }

    for (float value : telemetry) {
        send(client_socket, reinterpret_cast<const char*>(&value), sizeof(value), 0);
    }

    closesocket(client_socket);
    WSACleanup();
}

// Unified main function
int main() {
    const std::string cc_host = "127.0.0.1";
    const int drone_port = 65433;
    const int cc_port = 65434;

    // Receive binary packet from drone
    std::vector<int> data_bits = receive_packet_from_drone("127.0.0.1", drone_port);
    if (data_bits.empty()) return 1;

    // Ensure an even number of bits
    if (data_bits.size() % 2 != 0) {
        std::cerr << "Warning: Received odd number of bits. Adding padding.\n";
        data_bits.push_back(0); // Add padding if odd
    }

    // Modulation
    double carrier_frequency = 10.0, sampling_rate = 100.0, duration = 0.1;
    std::vector<double> modulated_signal = qpsk_modulation(data_bits, carrier_frequency, sampling_rate, duration);

    // Write modulated signal to binary file
    write_to_binary_file("modulated_samples.bin", modulated_signal);

    // Read modulated signal from binary file
    std::vector<double> loaded_modulated_signal = read_from_binary_file("modulated_samples.bin");

    // Noise Addition
    std::vector<double> noisy_signal = add_gaussian_noise(loaded_modulated_signal, 0.0, 0.1);

    // Write noisy signal to binary file
    write_to_binary_file("noisy_samples.bin", noisy_signal);

    // Read noisy signal for further processing
    std::vector<double> loaded_noisy_signal = read_from_binary_file("noisy_samples.bin");

    // Demodulation
    std::vector<int> demodulated_bits = demodulate_qpsk(loaded_noisy_signal, carrier_frequency, sampling_rate, duration);

    // Remove Padding
    if (demodulated_bits.size() % 2 != 0) {
        demodulated_bits.pop_back();
    }

    // Reconstruct Telemetry
    std::vector<float> telemetry = reconstruct_telemetry(demodulated_bits);

    // Send Telemetry to Command and Control
    send_telemetry(telemetry, cc_host, cc_port);

    return 0;
}
