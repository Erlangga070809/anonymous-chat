const generateAnonymousId = () => {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `Anonymous ${num}`;
};

const generateToken = () => {
    return require('crypto').randomBytes(32).toString('hex');
};

const calculateAge = (dateOfBirth) => {
    const dob = new Date(dateOfBirth);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
        age--;
    }
    
    return age;
};

module.exports = {
    generateAnonymousId,
    generateToken,
    calculateAge
};
