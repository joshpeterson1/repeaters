from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

# This is required for Vercel serverless functions
def handler(event, context):
    return app

if __name__ == '__main__':
    # This is only for local development
    app.run(debug=True, host='0.0.0.0', port=5000)
