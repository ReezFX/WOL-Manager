@logs.route('/system')
@login_required
def system_logs():
    """
    System logs page
    """
    try:
        # Get query parameters
        search_term = request.args.get('search', '')
        log_level = request.args.get('level', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Get system logs only from journalctl now
        system_logs = get_system_logs(search_term, log_level, start_date, end_date, use_db=False)
        
        # Show message that database logging is no longer available
        flash("Database logging has been removed. Only system journal logs are available.", "warning")
        
        return render_template('logs/system.html',
                              system_logs=system_logs,
                              search_term=search_term,
                              log_level=log_level,
                              start_date=start_date,
                              end_date=end_date)
    except Exception as e:
        logger.error(f"Error in system logs route: {str(e)}")
        flash(f"Error retrieving system logs: {str(e)}", "danger")
        return redirect(url_for('logs.index'))
        # Get logs from all sources
        system_logs = get_system_logs(search_term, log_level, start_date, end_date, use_db=False)
        auth_logs = get_auth_logs(search_term, start_date, end_date)
        wol_logs = get_wol_logs(search_term, start_date, end_date)
        
        # Combine all logs
        combined = []

        # Show message that database logging is no longer available
        flash("Database logging has been removed. System logs are from journal only.", "warning")
        
        for log in system_logs:
            combined.append({'type': 'system', 'content': log})
@logs.route('/system/export')
@login_required
def export_system_logs():
    """
    Export system logs to CSV
    """
    try:
        # Get query parameters
        search_term = request.args.get('search', '')
        log_level = request.args.get('level', '')
        start_date = request.args.get('start_date', '')
        end_date = request.args.get('end_date', '')
        
        # Get system logs only from journalctl
        system_logs = get_system_logs(search_term, log_level, start_date, end_date, use_db=False)
        
        # Generate CSV using helper function with proper metadata handling
        output = generate_csv(system_logs, ['Log Entry'])
        
        # Create response
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"system_logs_{timestamp}.csv"
        
        # Log export activity with safely converted metadata
        try:
            metadata = {
                'filters': {
                    'search': search_term,
                    'level': log_level,
                    'start_date': start_date,
                    'end_date': end_date
                }
            }
            safe_metadata = metadata_to_dict(metadata)
            logger.info(f"User {current_user.username} exported system logs", extra={'metadata': safe_metadata})
        except Exception as e:
            logger.warning
