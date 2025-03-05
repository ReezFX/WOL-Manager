from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField, TextAreaField, HiddenField, SelectMultipleField
from wtforms.validators import DataRequired, Length, EqualTo, ValidationError, Regexp, Optional

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember = BooleanField('Remember Me')
    submit = SubmitField('Sign In')

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[
        DataRequired(),
        Length(min=3, max=20, message='Username must be between 3 and 20 characters')
    ])
    password = PasswordField('Password', validators=[
        DataRequired(),
        Length(min=8, message='Password must be at least 8 characters')
    ])
    password2 = PasswordField('Confirm Password', validators=[
        DataRequired(),
        EqualTo('password', message='Passwords must match')
    ])
    submit = SubmitField('Register')

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


