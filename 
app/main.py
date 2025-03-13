    # Check if the user is authenticated (either via Flask-Login or custom session)
    if not current_user.is_authenticated and not session.get('authenticated'):
        logger.warning("Unauthorized attempt to access dashboard, redirecting to login")
        flash('Please log in to access this page.', 'warning')
        return redirect(url_for('auth.login', next='/dashboard'))
    # Get hosts based on user role
    if user.is_admin:
        logger.info(f"Admin user {user.username} (ID: {user.id}) accessing dashboard with all hosts")
        hosts = db_session.query(Host).all()
        # Get all the role IDs of the current user
        logger.info(f"User {user.username} (ID: {user.id}) accessing dashboard with filtered hosts")
        user_role_ids = [role.id for role in user.roles]
        except Exception as e:
            # Fallback to just showing hosts created by the user
            logger.error(f"Error fetching hosts for user {user.username} (ID: {user.id}): {str(e)}")
            hosts = db_session.query(Host).filter(created_by_filter).all()
            flash(f"Limited dashboard visibility due to an error: {str(e)}", "warning")
@main.errorhandler(404)
def page_not_found(e):
    """Custom 404 page."""
    path = request.path
    logger.warning(f"404 error: {path} not found")
    return render_template('404.html'), 404
@main.errorhandler(500)
def internal_server_error(e):
    """Custom 500 page."""
    logger.error(f"500 server error: {str(e)}")
    return render_template('500.html'), 500
    if not current_user.is_authenticated and not session.get('authenticated'):
        logger.warning(f"Unauthorized API access attempt from IP: {request.remote_addr}")
        return jsonify({'error': 'Authentication required'}), 401
    except Exception as e:
        logger.warning(f"Invalid ping request format from {request.remote_addr}: {str(e)}")
        return jsonify({'error': f'Invalid request format: {str(e)}'}), 400
        user_id = current_user.id
        is_admin = current_user.is_admin
    
    logger.info(f"Ping request for {len(host_ids)} hosts from user ID: {user_id}, is_admin: {is_admin}")
            logger.warning(f"User {user_id} attempted to ping inaccessible hosts: {host_ids}")
            return jsonify({'error': 'No accessible hosts found with the provided IDs'}), 404
    except Exception as e:
        logger.error(f"Database error in ping_hosts_api: {str(e)}")
        return jsonify({'error': f'Database error: {str(e)}'}), 500
                logger.debug(f"Using cached ping result for host ID: {host_id_str}")
        except Exception as e:
            logger.error(f"Error pinging host {host.name} (ID: {host.id}): {str(e)}")
            results[host.id] = {
    logger.info(f"Completed ping request for {len(hosts)} hosts")
    return jsonify({'hosts': results})
