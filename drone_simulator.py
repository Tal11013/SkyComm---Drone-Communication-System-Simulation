import random
import socket
import threading
import pygame
import sys
from pygame.locals import *


class DroneSimulator:
    def __init__(self, host='127.0.0.1', port=65433):
        self.speed = 5  # Speed in pixels per frame
        self.direction = 0  # Direction in degrees
        self.latitude = random.uniform(0, 100)  # Initial latitude
        self.longitude = random.uniform(0, 100)  # Initial longitude
        self.altitude = random.uniform(0, 500)  # Initial altitude
        self.host = host
        self.port = port
        self.running = True

        # Start telemetry sender in a separate thread
        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect((self.host, self.port))
        telemetry_thread = threading.Thread(target=self.send_telemetry, daemon=True)
        telemetry_thread.start()

    def move(self, direction):
        """Move the drone in a given direction."""
        if direction == "UP":
            self.altitude += self.speed
        elif direction == "DOWN" and self.altitude > 0:
            self.altitude -= self.speed
        elif direction == "LEFT":
            self.longitude -= self.speed
        elif direction == "RIGHT":
            self.longitude += self.speed
        elif direction == "FORWARD":
            self.latitude -= self.speed
        elif direction == "BACKWARD":
            self.latitude += self.speed

    def send_telemetry(self):
        """Send telemetry data every second."""
        while self.running:
            # Pack telemetry data into a formatted string
            telemetry_data = f"{self.speed:.2f},{self.direction:.2f},{self.latitude:.6f},{self.longitude:.6f},{self.altitude:.2f}"
            bitstream = telemetry_data.encode('utf-8')  # Convert string to bytes
            print(f"Sending telemetry data: {telemetry_data}")  # Log the data being sent
            # Send the bitstream to the modulator
            self.socket.sendall(bitstream)
            threading.Event().wait(1)


# Pygame GUI
window_width = 800
window_height = 600
pygame.init()
window = pygame.display.set_mode((window_width, window_height))
pygame.display.set_caption("Drone Flight Simulator")

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

# Load the drone image
drone_image = pygame.image.load('images/drone.png')
drone_image = pygame.transform.scale(drone_image, (40, 40))
current_size = 40


# Main function
def flight_simulator(drone):
    global drone_image, current_size

    drone_x = window_width // 2
    drone_y = window_height // 2

    while True:
        for event in pygame.event.get():
            if event.type == QUIT:
                drone.running = False
                pygame.quit()
                sys.exit()

        keys = pygame.key.get_pressed()

        if keys[K_UP]:
            drone.move("UP")
            drone_y -= drone.speed if drone_y > 0 else 0
        if keys[K_DOWN]:
            drone.move("DOWN")
            drone_y += drone.speed if drone_y < window_height - drone_image.get_height() else 0
        if keys[K_LEFT]:
            drone.move("LEFT")
            drone_x -= drone.speed if drone_x > 0 else 0
        if keys[K_RIGHT]:
            drone.move("RIGHT")
            drone_x += drone.speed if drone_x < window_width - drone_image.get_width() else 0
        if keys[K_w]:
            drone.move("BACKWARD")
            current_size = min(100, current_size - 0.5)  # Max size of 100
            drone_image = pygame.transform.scale(pygame.image.load('images/drone.png'), (current_size, current_size))
        if keys[K_s]:
            drone.move("FORWARD")
            current_size = max(20, current_size + 0.5)  # Min size of 20
            drone_image = pygame.transform.scale(pygame.image.load('images/drone.png'), (current_size, current_size))

        # Clear the screen
        window.fill(WHITE)

        # Draw the drone
        window.blit(drone_image, (drone_x, drone_y))

        # Update the display
        pygame.display.update()

        # Frame rate
        pygame.time.Clock().tick(30)


if __name__ == "__main__":
    drone = DroneSimulator()
    flight_simulator(drone)
