const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

const validateUsername = (username) => {
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
};

const validatePassword = (password) => {
    return password.length >= 8 && password.length <= 100;
};

const validateName = (name) => {
    return name.length >= 2 && name.length <= 100;
};

const validateAge = (dateOfBirth) => {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    const age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        return age - 1;
    }
    
    return age;
};

module.exports = {
    validateEmail,
    validateUsername,
    validatePassword,
    validateName,
    validateAge
};
