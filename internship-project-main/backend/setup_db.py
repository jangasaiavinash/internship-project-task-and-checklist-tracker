import os
import sys
import mysql.connector

def run_setup(password):
    schema_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "database", "schema.sql"))
    if not os.path.exists(schema_path):
        print(f"Error: schema.sql not found at {schema_path}")
        return False

    print("Connecting to MySQL...")
    try:
        # Connect to MySQL (no database specified initially)
        conn = mysql.connector.connect(
            host="localhost",
            user="root",
            password=password
        )
        cursor = conn.cursor()
        print("Connected successfully!")
    except Exception as e:
        print(f"Failed to connect to MySQL: {e}")
        return False

    print("Reading and executing schema.sql...")
    try:
        with open(schema_path, "r", encoding="utf-8") as f:
            sql_content = f.read()

        # Split SQL commands by semi-colon (basic splitter)
        commands = sql_content.split(";")
        for command in commands:
            cmd = command.strip()
            if not cmd:
                continue
            try:
                cursor.execute(cmd)
            except Exception as e:
                # Ignore duplicate key error for seed insert
                if "Duplicate entry" in str(e):
                    continue
                print(f"Warning during SQL execution: {e}")
        
        conn.commit()
        cursor.close()
        conn.close()
        print("Database schema imported successfully!")
    except Exception as e:
        print(f"Error importing schema: {e}")
        return False

    # Update backend/.env file
    env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), ".env"))
    try:
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            with open(env_path, "w", encoding="utf-8") as f:
                updated_pw = False
                for line in lines:
                    if line.startswith("DB_PASSWORD="):
                        f.write(f"DB_PASSWORD={password}\n")
                        updated_pw = True
                    else:
                        f.write(line)
                if not updated_pw:
                    f.write(f"DB_PASSWORD={password}\n")
        else:
            with open(env_path, "w", encoding="utf-8") as f:
                f.write("FLASK_ENV=development\n")
                f.write("SECRET_KEY=change-this-secret\n")
                f.write("DB_HOST=localhost\n")
                f.write("DB_USER=root\n")
                f.write(f"DB_PASSWORD={password}\n")
                f.write("DB_NAME=internship_tracker\n")

        print("backend/.env file updated successfully!")
        return True
    except Exception as e:
        print(f"Error updating .env file: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python setup_db.py <mysql_password>")
        sys.exit(1)
    
    password = sys.argv[1]
    success = run_setup(password)
    sys.exit(0 if success else 1)
