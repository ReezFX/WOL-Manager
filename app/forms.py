from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField, TextAreaField, HiddenField, SelectMultipleField, IntegerField
from wtforms.validators import DataRequired, Length, EqualTo, ValidationError, Regexp, Optional, NumberRange

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember = BooleanField('Remember Me')
    submit = SubmitField('Sign In')

class UserForm(FlaskForm):
    username = StringField('Username', validators=[
        DataRequired(),
        Length(min=3, max=64, message='Username must be between 3 and 64 characters')
    ])
    password = PasswordField('Password', validators=[
        DataRequired(),
        Length(min=8, message='Password must be at least 8 characters long')
    ])
    password_confirm = PasswordField('Confirm Password', validators=[
        DataRequired(),
        EqualTo('password', message='Passwords must match')
    ])
    submit = SubmitField('Add User')

class HostForm(FlaskForm):
    name = StringField('Host Name', validators=[
        DataRequired(),
        Length(min=1, max=64, message='Name must be between 1 and 64 characters')
    ])
    mac_address = StringField('MAC Address', validators=[
        DataRequired(),
        Regexp(r'^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$', 
               message='Invalid MAC address format. Expected format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX')
    ])
    ip_address = StringField('IP Address', validators=[
        Optional(),
        Regexp(r'^(\d{1,3}\.){3}\d{1,3}$', message='Invalid IP address format')
    ])
    description = TextAreaField('Description', validators=[
        Optional(),
        Length(max=255, message='Description must be less than 255 characters')
    ])
    visible_to_roles = SelectMultipleField('Visible to Roles', choices=[], coerce=int)
    submit = SubmitField('Save Host')
    
    def validate_ip_address(self, field):
        if field.data:
            # Check if each octet is between 0 and 255
            try:
                octets = field.data.split('.')
                for octet in octets:
                    value = int(octet)
                    if value < 0 or value > 255:
                        raise ValidationError('IP address octets must be between 0 and 255')
            except ValueError:
                raise ValidationError('Invalid IP address format')

class WakeForm(FlaskForm):
    host_id = HiddenField('Host ID', validators=[DataRequired()])
    submit = SubmitField('Wake Host')


class AppSettingsForm(FlaskForm):
    min_password_length = IntegerField('Minimum Password Length', 
        validators=[
            DataRequired(),
            NumberRange(min=6, max=16, message='Password length must be between 6 and 16 characters')
        ],
        description='The minimum number of characters required for user passwords')
    
    require_special_characters = BooleanField('Require Special Characters',
        description='Require passwords to contain at least one special character (e.g., @, #, $, %)')
    
    require_numbers = BooleanField('Require Numbers',
        description='Require passwords to contain at least one number')
    
    password_expiration_days = IntegerField('Password Expiration (Days)',
        validators=[
            DataRequired(),
            NumberRange(min=0, max=365, message='Password expiration must be between 0 and 365 days')
        ],
        description='Number of days before passwords expire. Use 0 for no expiration.')
    
    session_timeout_minutes = IntegerField('Session Timeout (Minutes)',
        validators=[
            DataRequired(),
            NumberRange(min=5, max=10080, message='Session timeout must be between 5 minutes and 7 days (10080 minutes)')
        ],
        description='Number of minutes before user sessions expire. Minimum 5 minutes, maximum 7 days.')
    
    max_concurrent_sessions = IntegerField('Maximum Concurrent Sessions',
        validators=[
            DataRequired(),
            NumberRange(min=0, max=10, message='Maximum concurrent sessions must be between 0 and 10')
        ],
        description='Maximum number of concurrent sessions per user. Use 0 for unlimited sessions.')
    
    submit = SubmitField('Save Settings')

