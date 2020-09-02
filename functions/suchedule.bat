set currentdate=%date:/=-%
cd C:\Users\godin\FirebaseProject\dbh-price-info-summary
copy C:\Users\godin\MyLaravel\PIS\storage\app\public\products_%currentdate%.json C:\Users\godin\FirebaseProject\dbh-price-info-summary\functions\json_data\products
copy C:\Users\godin\MyLaravel\PIS\storage\app\public\histories_%currentdate%.json C:\Users\godin\FirebaseProject\dbh-price-info-summary\functions\json_data\histories
copy C:\Users\godin\MyLaravel\PIS\storage\app\public\history_details_%currentdate%.json C:\Users\godin\FirebaseProject\dbh-price-info-summary\functions\json_data\history_details
firebase deploy
exit