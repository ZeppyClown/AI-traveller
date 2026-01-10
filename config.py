"""
Configuration file for AI Travel Planner
"""
import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
GOOGLE_MAPS_API_KEY = os.getenv("GOOGLE_MAPS_API_KEY")
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Default settings
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gemini-pro")

# Validate API keys (warn but don't fail - allows for testing UI without keys)
if not GOOGLE_MAPS_API_KEY:
    print("WARNING: GOOGLE_MAPS_API_KEY not found in environment variables")
if not OPENWEATHER_API_KEY:
    print("WARNING: OPENWEATHER_API_KEY not found in environment variables")
if not GEMINI_API_KEY:
    print("WARNING: GEMINI_API_KEY not found in environment variables")
