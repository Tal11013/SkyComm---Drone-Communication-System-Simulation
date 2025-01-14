import struct
import socket


class CommandControl:
    def __init__(self, host='127.0.0.1', port=65434):  # New port for demodulator communication
        self.host = host
        self.port = port

    def start_server(self):
        """Start the server to receive telemetry data."""
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as server_socket:
            server_socket.bind((self.host, self.port))
            server_socket.listen(1)
            print(f"Command and Control server running on {self.host}:{self.port}", flush=True)

            conn, addr = server_socket.accept()
            print(f"Connection established with {addr}", flush=True)

            with conn:
                while True:
                    data = conn.recv(20)  # Receiving 5 floats (5 x 4 bytes = 20 bytes)
                    if not data:
                        break
                    self.parse_telemetry(data)

    def parse_telemetry(self, data):
        """Parse and display telemetry data."""
        try:
            speed, direction, latitude, longitude, altitude = struct.unpack('fffff', data)
            print(
                f"Received Telemetry Data: Speed={speed}, Direction={direction}, Latitude={latitude}, Longitude={longitude}, Altitude={altitude}")
        except struct.error:
            print("Error parsing telemetry data")


if __name__ == "__main__":
    command_control = CommandControl()
    command_control.start_server()


