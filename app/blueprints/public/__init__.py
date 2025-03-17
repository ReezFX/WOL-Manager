from flask import Blueprint

bp = Blueprint('public', __name__, url_prefix='/public')

from . import routes

