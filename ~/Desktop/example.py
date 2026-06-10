#!/usr/bin/env python3
"""
A simple Python example script.
This script demonstrates basic Python functionality.
"""

def greet(name):
    """Greet someone by name."""
    return f"Hello, {name}!"


def add_numbers(a, b):
    """Add two numbers and return the result."""
    return a + b


def main():
    """Main function to demonstrate the script."""
    print("=" * 50)
    print("Welcome to the Python Example Script")
    print("=" * 50)
    
    # Greeting example
    name = "World"
    greeting = greet(name)
    print(f"\n{greeting}")
    
    # Math example
    num1, num2 = 10, 20
    result = add_numbers(num1, num2)
    print(f"\n{num1} + {num2} = {result}")
    
    # List example
    numbers = [1, 2, 3, 4, 5]
    print(f"\nList of numbers: {numbers}")
    print(f"Sum: {sum(numbers)}")
    print(f"Average: {sum(numbers) / len(numbers):.2f}")
    
    print("\n" + "=" * 50)
    print("Script completed successfully!")
    print("=" * 50)


if __name__ == "__main__":
    main()
