
import os
from dotenv import load_dotenv

# Load variables from ./ .env into environment
load_dotenv()

from app import create_app  # import after env is loaded

app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    app.run(host="0.0.0.0", port=port, debug=True, use_reloader=False)