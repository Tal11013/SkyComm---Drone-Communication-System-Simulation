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
            print(f"Command and Control server running on {self.host}:{self.port}")

            conn, addr = server_socket.accept()
            print(f"Connection established with {addr}")

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
            print(f"Received telemetry data:")
            print(f"  Speed: {speed:.2f} m/s")
            print(f"  Direction: {direction:.2f} degrees")
            print(f"  Latitude: {latitude:.2f}")
            print(f"  Longitude: {longitude:.2f}")
            print(f"  Altitude: {altitude:.2f} meters")
        except struct.error:
            print("Error parsing telemetry data")


if __name__ == "__main__":
    command_control = CommandControl()
    command_control.start_server()
