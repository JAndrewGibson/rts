from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Player(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    color = db.Column(db.String(20), default='#2c3e50')
    ink = db.Column(db.Integer, default=500)
    shavings = db.Column(db.Integer, default=100)

class UnitState(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    unit_id = db.Column(db.Integer, nullable=False) # Local ID from client
    player_id = db.Column(db.Integer, db.ForeignKey('player.id'), nullable=False)
    unit_type = db.Column(db.String(20), nullable=False)
    x = db.Column(db.Float, nullable=False)
    y = db.Column(db.Float, nullable=False)
    hp = db.Column(db.Float, nullable=False)
